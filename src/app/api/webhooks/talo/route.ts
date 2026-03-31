import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, TaloWebhookPayload } from '@/lib/talo'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-talo-signature') || req.headers.get('x-signature') || ''
  const webhookSecret = process.env.TALO_WEBHOOK_SECRET

  // Verify webhook signature if secret is configured
  if (webhookSecret && signature) {
    const isValid = verifyWebhookSignature(body, signature, webhookSecret)
    if (!isValid) {
      console.error('Invalid Talo webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: TaloWebhookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Handle payment received event
  if (
    payload.event === 'transfer.received' ||
    payload.event === 'payment.received' ||
    payload.event === 'cvu.credit'
  ) {
    const { data } = payload
    const transactionId = data.transaction_id
    const cvuId = data.cvu_id
    const amount = data.amount

    // Find client by CVU ID
    const client = await prisma.client.findFirst({
      where: { cvuId },
    })

    if (!client) {
      console.log(`Talo webhook: No client found for CVU ID ${cvuId}`)
      return NextResponse.json({ received: true, processed: false, reason: 'No client found' })
    }

    // Check if already imported
    const existing = await prisma.payment.findUnique({
      where: { externalId: transactionId },
    })

    if (existing) {
      return NextResponse.json({ received: true, processed: false, reason: 'Already imported' })
    }

    // Create payment and auto-allocate
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId: client.id,
          amount: new Prisma.Decimal(amount),
          date: new Date(data.date),
          method: 'CVU',
          reference: data.reference,
          notes: data.sender_name ? `Transferencia de ${data.sender_name}` : 'Transferencia CVU (webhook)',
          externalId: transactionId,
        },
      })

      // Auto-allocate to oldest pending charges
      const pendingCharges = await tx.charge.findMany({
        where: {
          clientId: client.id,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { date: 'asc' },
        include: { paymentAllocations: true },
      })

      let remaining = amount

      for (const charge of pendingCharges) {
        if (remaining <= 0) break

        const alreadyPaid = charge.paymentAllocations.reduce(
          (sum, a) => sum + Number(a.amount),
          0
        )
        const chargeBalance = Number(charge.amount) - alreadyPaid
        if (chargeBalance <= 0) continue

        const allocated = Math.min(remaining, chargeBalance)
        remaining -= allocated

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            chargeId: charge.id,
            amount: new Prisma.Decimal(allocated),
          },
        })

        const newAlreadyPaid = alreadyPaid + allocated
        const newStatus =
          newAlreadyPaid >= Number(charge.amount)
            ? 'PAID'
            : newAlreadyPaid > 0
            ? 'PARTIAL'
            : 'PENDING'

        await tx.charge.update({
          where: { id: charge.id },
          data: { status: newStatus },
        })
      }

      return payment
    })

    console.log(`Talo webhook: Payment of ${amount} created for client ${client.name}`)
    return NextResponse.json({ received: true, processed: true })
  }

  // Unknown event — acknowledge but don't process
  return NextResponse.json({ received: true, processed: false, event: payload.event })
}
