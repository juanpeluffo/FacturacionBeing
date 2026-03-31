import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listTransactions, isTaloConfigured } from '@/lib/talo'
import { Prisma } from '@prisma/client'

type RouteParams = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isTaloConfigured()) {
    return NextResponse.json(
      { error: 'Talo Pay no está configurado' },
      { status: 503 }
    )
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (!client.cvuId) {
    return NextResponse.json(
      { error: 'Este cliente no tiene CVU asignado' },
      { status: 400 }
    )
  }

  // Fetch transactions from Talo Pay
  const { transactions } = await listTransactions(client.cvuId, { limit: 100 })

  const creditTransactions = transactions.filter(t => t.type === 'credit')

  let created = 0
  let skipped = 0

  for (const tx of creditTransactions) {
    // Check if already imported
    const existing = await prisma.payment.findUnique({
      where: { externalId: tx.id },
    })

    if (existing) {
      skipped++
      continue
    }

    // Create payment
    await prisma.$transaction(async (prismaClient) => {
      const payment = await prismaClient.payment.create({
        data: {
          clientId: params.id,
          amount: new Prisma.Decimal(tx.amount),
          date: new Date(tx.date),
          method: 'CVU',
          reference: tx.reference,
          notes: tx.senderName ? `Transferencia de ${tx.senderName}` : 'Transferencia CVU',
          externalId: tx.id,
        },
      })

      // Auto-allocate to pending charges
      const pendingCharges = await prismaClient.charge.findMany({
        where: {
          clientId: params.id,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { date: 'asc' },
        include: { paymentAllocations: true },
      })

      let remaining = tx.amount

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

        await prismaClient.paymentAllocation.create({
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

        await prismaClient.charge.update({
          where: { id: charge.id },
          data: { status: newStatus },
        })
      }
    })

    created++
  }

  return NextResponse.json({
    success: true,
    created,
    skipped,
    total: creditTransactions.length,
  })
}
