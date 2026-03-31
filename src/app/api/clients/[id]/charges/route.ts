import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createChargeSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1, 'Descripción requerida'),
  date: z.string().datetime().or(z.string().refine(v => !isNaN(Date.parse(v)))),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type RouteParams = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createChargeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const charge = await prisma.charge.create({
    data: {
      clientId: params.id,
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes,
      status: 'PENDING',
    },
  })

  return NextResponse.json(charge, { status: 201 })
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const charges = await prisma.charge.findMany({
    where: { clientId: params.id },
    orderBy: { date: 'desc' },
    include: {
      invoice: { select: { id: true, type: true, number: true } },
      paymentAllocations: {
        include: { payment: { select: { id: true, date: true, method: true, amount: true } } },
      },
    },
  })

  return NextResponse.json(charges)
}
