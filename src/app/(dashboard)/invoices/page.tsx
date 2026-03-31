'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Download, Receipt, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusLabel, getInvoiceTypeLabel } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Invoice {
  id: string
  type: string
  number?: number
  puntoVenta?: number
  total: number | string
  subtotal: number | string
  iva?: number | string
  status: string
  cae?: string
  caeDue?: string
  createdAt: string
  client: {
    id: string
    name: string
  }
}

export default function InvoicesPage() {
  const { data, isLoading } = useSWR<{ invoices: Invoice[]; total: number }>(
    '/api/invoices',
    fetcher
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Facturas</h1>
          <p className="text-muted text-sm mt-1">
            {data?.total ?? '–'} facturas emitidas
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data?.invoices.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <Receipt className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted-2 font-medium">Sin facturas</p>
          <p className="text-muted text-sm mt-1">
            Las facturas se generan desde la cuenta corriente de cada cliente
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_200px_140px_120px_80px] gap-4 px-6 py-3 border-b border-border">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Cliente / Tipo</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Número</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Fecha</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider text-right">Total</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider text-right">PDF</span>
          </div>

          <div className="divide-y divide-border">
            {data?.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid grid-cols-[1fr_200px_140px_120px_80px] gap-4 px-6 py-4 hover:bg-surface-2 transition-colors items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/clients/${invoice.client.id}`}
                      className="text-sm font-medium text-white hover:text-accent transition-colors truncate"
                    >
                      {invoice.client.name}
                    </Link>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {getInvoiceTypeLabel(invoice.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        invoice.status === 'PAID' ? 'success' :
                        invoice.status === 'SENT' ? 'default' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {getStatusLabel(invoice.status)}
                    </Badge>
                    {invoice.cae && (
                      <span className="text-xs text-green-400">CAE: {invoice.cae}</span>
                    )}
                  </div>
                </div>

                <div>
                  {invoice.number && invoice.puntoVenta ? (
                    <p className="text-sm text-white font-mono">
                      {String(invoice.puntoVenta).padStart(4, '0')}-{String(invoice.number).padStart(8, '0')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted">—</p>
                  )}
                  {invoice.caeDue && (
                    <p className="text-xs text-muted mt-0.5">Vence CAE: {formatDate(invoice.caeDue)}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-white">{formatDate(invoice.createdAt)}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(Number(invoice.total))}</p>
                  {invoice.iva && Number(invoice.iva) > 0 && (
                    <p className="text-xs text-muted mt-0.5">+IVA {formatCurrency(Number(invoice.iva))}</p>
                  )}
                </div>

                <div className="text-right">
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    className="text-muted hover:text-accent transition-colors inline-flex"
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
