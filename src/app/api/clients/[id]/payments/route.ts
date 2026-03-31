import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const createPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  date: z.string().refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),
  method: z.enum(['CVU', 'CASH', 'BANK_TRANSFER', 'OTHER']),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  chargeIds: z.array(z.string()).optional(), // charges to allocate this payment to
})

type RouteParams = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createPaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { chargeIds, ...paymentData } = parsed.data

  // Use a transaction to create payment and update charge statuses
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        clientId: params.id,
        amount: paymentData.amount,
        date: new Date(paymentData.date),
        method: paymentData.method,
        reference: paymentData.reference,
        notes: paymentData.notes,
      },
    })

    // Auto-allocate payment to pending charges if chargeIds provided
    if (chargeIds && chargeIds.length > 0) {
      let remaining = paymentData.amount

      for (const chargeId of chargeIds) {
        if (remaining <= 0) break

        const charge = await tx.charge.findFirst({
          where: { id: chargeId, clientId: params.id },
          include: { paymentAllocations: true },
        })

        if (!charge) continue

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
            chargeId: chargeId,
            amount: new Prisma.Decimal(allocated),
          },
        })

        // Update charge status
        const newAlreadyPaid = alreadyPaid + allocated
        const newStatus =
          newAlreadyPaid >= Number(charge.amount)
            ? 'PAID'
            : newAlreadyPaid > 0
            ? 'PARTIAL'
            : 'PENDING'

        await tx.charge.update({
          where: { id: chargeId },
          data: { status: newStatus },
        })
      }
    } else {
      // Auto-allocate to oldest pending charges
      const pendingCharges = await tx.charge.findMany({
        where: {
          clientId: params.id,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { date: 'asc' },
        include: { paymentAllocations: true },
      })

      let remaining = paymentData.amount

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
    }

    return payment
  })

  return NextResponse.json(result, { status: 201 })
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payments = await prisma.payment.findMany({
    where: { clientId: params.id },
    orderBy: { date: 'desc' },
    include: {
      allocations: {
        include: {
          charge: { select: { id: true, description: true, amount: true } },
        },
      },
    },
  })

  return NextResponse.json(payments)
}
