import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createCVUAccount, isTaloConfigured } from '@/lib/talo'

const createClientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  cuit: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable(),
  billingType: z.enum(['AFIP', 'COMMON']).default('COMMON'),
  notes: z.string().optional().nullable(),
  createCVU: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { cuit: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { charges: true, payments: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ])

  // Calculate balance for each client
  const clientsWithBalance = await Promise.all(
    clients.map(async (client) => {
      const [chargesSum, paymentsSum] = await Promise.all([
        prisma.charge.aggregate({
          where: { clientId: client.id },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { clientId: client.id },
          _sum: { amount: true },
        }),
      ])

      const totalCharged = Number(chargesSum._sum.amount || 0)
      const totalPaid = Number(paymentsSum._sum.amount || 0)
      const balance = totalCharged - totalPaid

      return {
        ...client,
        totalCharged,
        totalPaid,
        balance,
      }
    })
  )

  return NextResponse.json({
    clients: clientsWithBalance,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createClientSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { createCVU, ...data } = parsed.data

  let cvuData: { cvuId?: string; cvu?: string; alias?: string } = {}

  if (createCVU && isTaloConfigured()) {
    try {
      const account = await createCVUAccount(data.name)
      cvuData = {
        cvuId: account.id,
        cvu: account.cvu,
        alias: account.alias,
      }
    } catch (err) {
      console.error('Error creating CVU:', err)
      // Continue without CVU if it fails
    }
  }

  const client = await prisma.client.create({
    data: {
      ...data,
      email: data.email || null,
      ...cvuData,
    },
  })

  return NextResponse.json(client, { status: 201 })
}
