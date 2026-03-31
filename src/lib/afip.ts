/**
 * AFIP Electronic Invoice (WSFE) integration
 *
 * Requires:
 *   - AFIP_CUIT: CUIT of the issuer
 *   - AFIP_PUNTO_VENTA: punto de venta number
 *   - AFIP_CERT_PATH: path to .pem certificate file
 *   - AFIP_KEY_PATH: path to private key file
 *   - AFIP_PRODUCTION: "true" for production, "false" for testing
 *
 * Uses the Afip SDK (afip.ar) for WSFE operations.
 */

import fs from 'fs'
import path from 'path'

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  ivaRate: number // 0 for exento, 21 for 21%
  subtotal: number
}

export interface AFIPInvoiceData {
  clientCuit: string
  clientName: string
  items: InvoiceItem[]
  subtotal: number
  iva: number
  total: number
  puntoVenta: number
  tipoComprobante: number // 6 = B, 11 = C
  dueDate?: Date
}

export interface AFIPInvoiceResult {
  cae: string
  caeDue: Date
  number: number
  puntoVenta: number
}

function getAfipConfig() {
  const cuit = process.env.AFIP_CUIT
  const puntoVenta = parseInt(process.env.AFIP_PUNTO_VENTA || '1')
  const certPath = path.resolve(process.cwd(), process.env.AFIP_CERT_PATH || './certs/afip.crt')
  const keyPath = path.resolve(process.cwd(), process.env.AFIP_KEY_PATH || './certs/afip.key')
  const production = process.env.AFIP_PRODUCTION === 'true'

  return { cuit, puntoVenta, certPath, keyPath, production }
}

export function isAfipConfigured(): boolean {
  const { cuit, certPath, keyPath } = getAfipConfig()
  if (!cuit) return false
  try {
    return fs.existsSync(certPath) && fs.existsSync(keyPath)
  } catch {
    return false
  }
}

/**
 * Issue an AFIP electronic invoice (Factura B or C)
 * Returns CAE and invoice number
 */
export async function issueAfipInvoice(data: AFIPInvoiceData): Promise<AFIPInvoiceResult> {
  if (!isAfipConfigured()) {
    throw new Error('AFIP no está configurado. Verificá las credenciales y certificados.')
  }

  const config = getAfipConfig()

  // Dynamic import to avoid loading AFIP SDK unless needed
  // The afip-ar package provides TypeScript types and WSFE integration
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Afip = require('afip.js')

    const afip = new Afip({
      CUIT: config.cuit,
      cert: fs.readFileSync(config.certPath, 'utf8'),
      key: fs.readFileSync(config.keyPath, 'utf8'),
      production: config.production,
    })

    // Get last invoice number
    const lastNumber = await afip.ElectronicBilling.getLastVoucher(
      config.puntoVenta,
      data.tipoComprobante
    )
    const nextNumber = lastNumber + 1

    // Build voucher data
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

    const voucherData: Record<string, unknown> = {
      CantReg: 1,
      PtoVta: config.puntoVenta,
      CbteTipo: data.tipoComprobante,
      Concepto: 2, // Servicios
      DocTipo: 80, // CUIT
      DocNro: data.clientCuit.replace(/[-\s]/g, ''),
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: dateStr,
      ImpTotal: data.total,
      ImpTotConc: 0,
      ImpNeto: data.subtotal,
      ImpOpEx: 0,
      ImpIVA: data.iva,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    }

    // Add IVA breakdown if not exento
    if (data.iva > 0) {
      voucherData.Iva = [
        {
          Id: 5, // 21%
          BaseImp: data.subtotal,
          Importe: data.iva,
        },
      ]
    }

    // Add due date for services
    if (data.dueDate) {
      const dueDateStr = data.dueDate.toISOString().split('T')[0].replace(/-/g, '')
      voucherData.FchServDesde = dateStr
      voucherData.FchServHasta = dateStr
      voucherData.FchVtoPago = dueDateStr
    }

    const result = await afip.ElectronicBilling.createVoucher(voucherData)

    const caeDueDate = new Date(
      result.CAEFchVto.slice(0, 4),
      parseInt(result.CAEFchVto.slice(4, 6)) - 1,
      result.CAEFchVto.slice(6, 8)
    )

    return {
      cae: result.CAE,
      caeDue: caeDueDate,
      number: nextNumber,
      puntoVenta: config.puntoVenta,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Error al emitir factura AFIP: ${message}`)
  }
}

export function getDefaultPuntoVenta(): number {
  return parseInt(process.env.AFIP_PUNTO_VENTA || '1')
}

export function getIssuerId(): string {
  return process.env.AFIP_CUIT || ''
}
