import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPaymentRequestEmail, isResendConfigured } from '@/lib/resend'
import { buildWhatsAppLink, formatCurrency } from '@/lib/utils'
import { z } from 'zod'

const notifySchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  chargeId: z.string().optional().nullable(),
  customMessage: z.string().optional().nullable(),
})

type RouteParams = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      charges: {
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        orderBy: { date: 'asc' },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const body = await req.json()
  const parsed = notifySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { channel, chargeId } = parsed.data

  // Determine what to notify about
  let targetCharge = null
  let amount = 0
  let description = ''

  if (chargeId) {
    targetCharge = await prisma.charge.findFirst({
      where: { id: chargeId, clientId: params.id },
    })
    if (!targetCharge) {
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    }
    amount = Number(targetCharge.amount)
    description = targetCharge.description
  } else {
    // Total balance
    const totalCharged = client.charges.reduce((sum, c) => sum + Number(c.amount), 0)
    const paymentsSum = await prisma.payment.aggregate({
      where: { clientId: params.id },
      _sum: { amount: true },
    })
    const totalPaid = Number(paymentsSum._sum.amount || 0)
    amount = totalCharged - totalPaid
    description = 'Saldo pendiente total'

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'El cliente no tiene saldo pendiente' },
        { status: 400 }
      )
    }
  }

  const AGENCY_NAME = process.env.AGENCY_NAME || 'Agencia Digital'
  const AGENCY_CVU = process.env.AGENCY_CVU || ''

  let logStatus = 'sent'
  let logMessage = ''
  let responseData: Record<string, unknown> = {}

  if (channel === 'WHATSAPP') {
    if (!client.whatsapp) {
      return NextResponse.json(
        { error: 'El cliente no tiene WhatsApp configurado' },
        { status: 400 }
      )
    }

    const message =
      parsed.data.customMessage ||
      `Hola ${client.name}! 👋\n\nTe contactamos de *${AGENCY_NAME}*.\n\nTenés un saldo pendiente de *${formatCurrency(amount)}*${description !== 'Saldo pendiente total' ? ` por "${description}"` : ''}.\n\n${AGENCY_CVU ? `Para abonar, podés hacer una transferencia al CVU: *${AGENCY_CVU}*\n\n` : ''}Cualquier consulta estamos a disposición. ¡Gracias!`

    logMessage = message

    // Check if WhatsApp API is configured
    const whatsappToken = process.env.WHATSAPP_API_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (whatsappToken && phoneNumberId) {
      // Send via Meta Cloud API
      try {
        const waResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: client.whatsapp.replace(/\D/g, ''),
              type: 'text',
              text: { body: message },
            }),
          }
        )
        const waData = await waResponse.json()
        responseData = { messageId: waData.messages?.[0]?.id, sent: true }
      } catch (err) {
        logStatus = 'failed'
        responseData = { error: String(err) }
      }
    } else {
      // Return wa.me link
      const waLink = buildWhatsAppLink(client.whatsapp, message)
      responseData = { waLink, requiresManualSend: true }
    }
  } else if (channel === 'EMAIL') {
    if (!client.email) {
      return NextResponse.json(
        { error: 'El cliente no tiene email configurado' },
        { status: 400 }
      )
    }

    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: 'Resend no está configurado (RESEND_API_KEY)' },
        { status: 503 }
      )
    }

    try {
      const result = await sendPaymentRequestEmail({
        clientName: client.name,
        clientEmail: client.email,
        amount,
        chargeDescription: targetCharge?.description,
        dueDate: targetCharge?.dueDate,
        chargeId: chargeId || undefined,
      })

      logMessage = `Email de solicitud de pago por ${formatCurrency(amount)}`
      responseData = { emailId: result.id }
    } catch (err) {
      logStatus = 'failed'
      logMessage = `Error enviando email: ${String(err)}`
      responseData = { error: String(err) }
    }
  }

  // Log notification
  await prisma.notificationLog.create({
    data: {
      clientId: params.id,
      channel,
      message: logMessage,
      status: logStatus,
      chargeId: chargeId || null,
      metadata: responseData,
    },
  })

  if (logStatus === 'failed') {
    return NextResponse.json({ error: 'Error al enviar notificación', ...responseData }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...responseData })
}
