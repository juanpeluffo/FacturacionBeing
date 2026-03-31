import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { issueAfipInvoice, isAfipConfigured, getDefaultPuntoVenta } from '@/lib/afip'
import { Prisma } from '@prisma/client'

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  ivaRate: z.number().min(0),
  subtotal: z.number().positive(),
})

const createInvoiceSchema = z.object({
  type: z.enum(['AFIP_B', 'AFIP_C', 'COMMON']),
  items: z.array(invoiceItemSchema).min(1),
  subtotal: z.number().positive(),
  iva: z.number().min(0),
  total: z.number().positive(),
  dueDate: z.string().optional().nullable(),
  chargeId: z.string().optional().nullable(),
})

type RouteParams = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createInvoiceSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  let afipResult: { cae: string; caeDue: Date; number: number; puntoVenta: number } | null = null

  // If AFIP type, try to issue via AFIP
  if (data.type === 'AFIP_B' || data.type === 'AFIP_C') {
    if (!client.cuit) {
      return NextResponse.json(
        { error: 'El cliente no tiene CUIT registrado para factura AFIP' },
        { status: 400 }
      )
    }

    if (!isAfipConfigured()) {
      return NextResponse.json(
        { error: 'AFIP no está configurado. Verificá los certificados.' },
        { status: 503 }
      )
    }

    const tipoComprobante = data.type === 'AFIP_B' ? 6 : 11

    afipResult = await issueAfipInvoice({
      clientCuit: client.cuit,
      clientName: client.name,
      items: data.items,
      subtotal: data.subtotal,
      iva: data.iva,
      total: data.total,
      puntoVenta: getDefaultPuntoVenta(),
      tipoComprobante,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientId: params.id,
      type: data.type,
      items: data.items as unknown as Prisma.InputJsonValue,
      subtotal: new Prisma.Decimal(data.subtotal),
      iva: data.iva > 0 ? new Prisma.Decimal(data.iva) : null,
      total: new Prisma.Decimal(data.total),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: afipResult ? 'SENT' : 'DRAFT',
      ...(afipResult && {
        cae: afipResult.cae,
        caeDue: afipResult.caeDue,
        number: afipResult.number,
        puntoVenta: afipResult.puntoVenta,
      }),
    },
  })

  // Link invoice to charge if specified
  if (data.chargeId) {
    await prisma.charge.update({
      where: { id: data.chargeId, clientId: params.id },
      data: { invoiceId: invoice.id },
    })
  }

  return NextResponse.json(invoice, { status: 201 })
}
