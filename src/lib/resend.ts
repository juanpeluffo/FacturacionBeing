import { Resend } from 'resend'
import { formatCurrency, formatDate } from './utils'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'facturacion@agencia.com'
const AGENCY_NAME = process.env.AGENCY_NAME || 'Agencia Digital'
const AGENCY_CVU = process.env.AGENCY_CVU || ''

export interface PaymentRequestEmailData {
  clientName: string
  clientEmail: string
  amount: number
  dueDate?: Date | string | null
  chargeDescription?: string
  chargeId?: string
  notes?: string
}

export async function sendPaymentRequestEmail(data: PaymentRequestEmailData): Promise<{ id: string }> {
  const { clientName, clientEmail, amount, dueDate, chargeDescription, notes } = data

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Pago</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #000; padding: 32px; text-align: center; }
    .header h1 { color: #CAFF00; font-size: 24px; margin: 0; letter-spacing: -0.5px; }
    .header p { color: #888; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #111; margin-bottom: 24px; }
    .amount-box { background: #f8f8f8; border: 2px solid #000; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
    .amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
    .amount-value { font-size: 40px; font-weight: 700; color: #000; letter-spacing: -1px; }
    .details { margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .detail-label { color: #666; }
    .detail-value { color: #111; font-weight: 500; }
    .cvu-box { background: #000; color: #CAFF00; padding: 20px; border-radius: 8px; margin: 24px 0; }
    .cvu-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
    .cvu-number { font-size: 18px; font-weight: 600; letter-spacing: 2px; }
    .footer { background: #f8f8f8; padding: 24px; text-align: center; font-size: 12px; color: #888; }
    .btn { display: inline-block; background: #CAFF00; color: #000; font-weight: 700; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${AGENCY_NAME}</h1>
      <p>Solicitud de Pago</p>
    </div>
    <div class="body">
      <p class="greeting">Hola <strong>${clientName}</strong>,</p>
      <p style="color:#444; font-size:15px;">Te enviamos el detalle de tu saldo pendiente:</p>

      <div class="amount-box">
        <div class="amount-label">Total a pagar</div>
        <div class="amount-value">${formatCurrency(amount)}</div>
      </div>

      <div class="details">
        ${chargeDescription ? `
        <div class="detail-row">
          <span class="detail-label">Concepto</span>
          <span class="detail-value">${chargeDescription}</span>
        </div>` : ''}
        ${dueDate ? `
        <div class="detail-row">
          <span class="detail-label">Vencimiento</span>
          <span class="detail-value">${formatDate(dueDate)}</span>
        </div>` : ''}
      </div>

      ${AGENCY_CVU ? `
      <p style="color:#444; font-size:14px; margin-top:24px;">Podés abonar mediante transferencia al siguiente CVU:</p>
      <div class="cvu-box">
        <div class="cvu-label">CVU</div>
        <div class="cvu-number">${AGENCY_CVU}</div>
      </div>` : ''}

      ${notes ? `<p style="color:#666; font-size:13px; margin-top:16px; font-style:italic;">${notes}</p>` : ''}

      <p style="color:#444; font-size:14px; margin-top:24px;">Ante cualquier consulta, no dudes en contactarnos.</p>
      <p style="color:#444; font-size:14px;">¡Gracias!</p>
    </div>
    <div class="footer">
      <p>${AGENCY_NAME}</p>
      <p>Este es un email automático. Por favor no respondas directamente.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const result = await resend.emails.send({
    from: `${AGENCY_NAME} <${FROM_EMAIL}>`,
    to: clientEmail,
    subject: `Solicitud de pago - ${formatCurrency(amount)} - ${AGENCY_NAME}`,
    html,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return { id: result.data!.id }
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
