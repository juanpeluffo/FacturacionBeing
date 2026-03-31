import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoicePDF } from '@/lib/pdf'

type RouteParams = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { client: true },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const items = invoice.items as Array<{
    description: string
    quantity: number
    unitPrice: number
    ivaRate: number
    subtotal: number
  }>

  const invoiceNumber = invoice.number
    ? `${String(invoice.puntoVenta || 1).padStart(4, '0')}-${String(invoice.number).padStart(8, '0')}`
    : `CC-${invoice.id.slice(-8).toUpperCase()}`

  const pdfBuffer = await generateInvoicePDF({
    invoiceNumber,
    date: invoice.createdAt,
    dueDate: invoice.dueDate,
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    clientCuit: invoice.client.cuit,
    items,
    subtotal: Number(invoice.subtotal),
    iva: Number(invoice.iva || 0),
    total: Number(invoice.total),
    cvuForPayment: invoice.client.cvu,
  })

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoiceNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
