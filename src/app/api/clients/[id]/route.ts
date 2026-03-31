import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  cuit: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable(),
  billingType: z.enum(['AFIP', 'COMMON']).optional(),
  cvu: z.string().optional().nullable(),
  alias: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type RouteParams = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      charges: {
        orderBy: { date: 'desc' },
        include: {
          invoice: { select: { id: true, type: true, number: true, cae: true } },
          paymentAllocations: {
            include: { payment: true },
          },
        },
      },
      payments: {
        orderBy: { date: 'desc' },
        include: {
          allocations: {
            include: { charge: { select: { id: true, description: true } } },
          },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
      notificationLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Calculate balance
  const totalCharged = client.charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPaid = client.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalCharged - totalPaid

  return NextResponse.json({
    ...client,
    totalCharged,
    totalPaid,
    balance,
  })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateClientSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  if (data.email === '') data.email = null

  const client = await prisma.client.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(client)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
