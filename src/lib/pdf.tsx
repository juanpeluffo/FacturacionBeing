/**
 * PDF invoice generator using @react-pdf/renderer
 * Used for "Factura Común" (non-AFIP clients)
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer'
import { formatCurrency, formatDate } from './utils'

const AGENCY_NAME = process.env.AGENCY_NAME || 'Agencia Digital'
const AGENCY_ADDRESS = process.env.AGENCY_ADDRESS || 'Buenos Aires, Argentina'
const AGENCY_CUIT = process.env.AGENCY_CUIT || ''
const AGENCY_CVU = process.env.AGENCY_CVU || ''

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 48,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  agencyAddress: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  invoiceLabel: {
    textAlign: 'right',
    marginTop: 4,
  },
  invoiceLabelText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    letterSpacing: -1,
  },
  invoiceNumber: {
    fontSize: 9,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  divider: {
    borderBottom: '2pt solid #CAFF00',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888888',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 9,
    color: '#666666',
    marginTop: 2,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    padding: 8,
    marginBottom: 0,
  },
  tableHeaderText: {
    color: '#CAFF00',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '0.5pt solid #eeeeee',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#333333',
  },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#666666',
  },
  totalValue: {
    fontSize: 9,
    color: '#333333',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '1.5pt solid #000000',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 48,
    right: 48,
  },
  footerDivider: {
    borderBottom: '0.5pt solid #dddddd',
    marginBottom: 12,
  },
  cvuBox: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  cvuLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cvuNumber: {
    fontSize: 12,
    color: '#CAFF00',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  footerNote: {
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
  },
})

export interface PDFInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  ivaRate: number
  subtotal: number
}

export interface PDFInvoiceData {
  invoiceNumber?: string
  date: Date
  dueDate?: Date | null
  clientName: string
  clientEmail?: string | null
  clientCuit?: string | null
  items: PDFInvoiceItem[]
  subtotal: number
  iva: number
  total: number
  notes?: string | null
  cvuForPayment?: string | null
}

function InvoiceDocument({ data }: { data: PDFInvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName}>{AGENCY_NAME}</Text>
            <Text style={styles.agencyAddress}>{AGENCY_ADDRESS}</Text>
            {AGENCY_CUIT && <Text style={styles.agencyAddress}>CUIT: {AGENCY_CUIT}</Text>}
          </View>
          <View style={styles.invoiceLabel}>
            <Text style={styles.invoiceLabelText}>FACTURA</Text>
            {data.invoiceNumber && (
              <Text style={styles.invoiceNumber}>N° {data.invoiceNumber}</Text>
            )}
            <Text style={styles.invoiceNumber}>Fecha: {formatDate(data.date)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.clientName}>{data.clientName}</Text>
          {data.clientEmail && <Text style={styles.clientDetail}>{data.clientEmail}</Text>}
          {data.clientCuit && <Text style={styles.clientDetail}>CUIT: {data.clientCuit}</Text>}
          {data.dueDate && (
            <Text style={styles.clientDetail}>Vencimiento: {formatDate(data.dueDate)}</Text>
          )}
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Descripción</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.tableHeaderText}>Cant.</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.tableHeaderText}>Precio unit.</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableHeaderText}>Total</Text>
            </View>
          </View>

          {data.items.map((item, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}
            >
              <View style={styles.colDescription}>
                <Text style={styles.cellText}>{item.description}</Text>
                {item.ivaRate > 0 && (
                  <Text style={[styles.cellText, { color: '#999', fontSize: 8 }]}>
                    IVA {item.ivaRate}%
                  </Text>
                )}
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cellText}>{item.quantity}</Text>
              </View>
              <View style={styles.colPrice}>
                <Text style={styles.cellText}>{formatCurrency(item.unitPrice)}</Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={styles.cellText}>{formatCurrency(item.subtotal)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          {data.iva > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA (21%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.iva)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          {(data.cvuForPayment || AGENCY_CVU) && (
            <View style={styles.cvuBox}>
              <Text style={styles.cvuLabel}>Datos para transferencia</Text>
              <Text style={styles.cvuNumber}>{data.cvuForPayment || AGENCY_CVU}</Text>
            </View>
          )}
          {data.notes && (
            <Text style={[styles.footerNote, { marginBottom: 8, color: '#444' }]}>
              {data.notes}
            </Text>
          )}
          <Text style={styles.footerNote}>
            {AGENCY_NAME} — Gracias por su confianza
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(data: PDFInvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return buffer
}
