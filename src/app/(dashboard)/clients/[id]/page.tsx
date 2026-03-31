'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit, Plus, RefreshCw, MessageCircle, Mail,
  Trash2, Download, Receipt, ChevronDown, ChevronUp,
  CreditCard, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  formatCurrency, formatDate, getStatusLabel, getPaymentMethodLabel,
  getBillingTypeLabel, formatCVU, buildWhatsAppLink,
} from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type ChargeStatus = 'PENDING' | 'PARTIAL' | 'PAID'

interface Charge {
  id: string
  amount: number | string
  description: string
  date: string
  dueDate?: string
  status: ChargeStatus
  notes?: string
  invoice?: { id: string; type: string; number?: number; cae?: string } | null
  paymentAllocations?: Array<{ amount: number | string; payment: { id: string; date: string; method: string } }>
}

interface Payment {
  id: string
  amount: number | string
  date: string
  method: string
  reference?: string
  notes?: string
  externalId?: string
}

interface ClientDetail {
  id: string
  name: string
  cuit?: string
  email?: string
  whatsapp?: string
  billingType: 'AFIP' | 'COMMON'
  cvu?: string
  alias?: string
  cvuId?: string
  notes?: string
  balance: number
  totalCharged: number
  totalPaid: number
  charges: Charge[]
  payments: Payment[]
  invoices: Array<{
    id: string
    type: string
    number?: number
    total: number | string
    status: string
    createdAt: string
    cae?: string
  }>
  notificationLogs: Array<{
    id: string
    channel: string
    message: string
    status: string
    createdAt: string
  }>
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id as string

  const { data: client, isLoading, mutate } = useSWR<ClientDetail>(
    `/api/clients/${clientId}`,
    fetcher
  )

  // Modals
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [notifyTarget, setNotifyTarget] = useState<{ chargeId?: string; amount?: number } | null>(null)

  // Section visibility
  const [showLogs, setShowLogs] = useState(false)

  // Sync loading
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncPayments = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/sync-payments`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast({
          type: 'success',
          title: `Sincronización completada`,
          description: `${data.created} pagos importados, ${data.skipped} ya existentes`,
        })
        mutate()
      } else {
        toast({ type: 'error', title: 'Error al sincronizar', description: data.error })
      }
    } catch {
      toast({ type: 'error', title: 'Error al sincronizar' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      toast({ type: 'success', title: 'Cliente eliminado' })
      router.push('/clients')
    } catch {
      toast({ type: 'error', title: 'Error al eliminar cliente' })
    }
  }

  const handleNotify = async (channel: 'WHATSAPP' | 'EMAIL', chargeId?: string) => {
    const res = await fetch(`/api/clients/${clientId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, chargeId: chargeId || null }),
    })
    const data = await res.json()

    if (data.waLink) {
      window.open(data.waLink, '_blank')
      mutate()
    } else if (data.success || data.emailId) {
      toast({ type: 'success', title: 'Notificación enviada' })
      mutate()
    } else {
      toast({ type: 'error', title: 'Error', description: data.error })
    }
    setShowNotifyModal(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface-2 rounded" />
        <div className="h-32 bg-surface-2 rounded-xl" />
        <div className="h-64 bg-surface-2 rounded-xl" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">Cliente no encontrado</p>
        <Link href="/clients">
          <Button variant="secondary" className="mt-4">Volver</Button>
        </Link>
      </div>
    )
  }

  const balanceColor =
    client.balance <= 0
      ? 'text-green-400'
      : client.balance > 0
      ? 'text-red-400'
      : 'text-yellow-400'

  const pendingCharges = client.charges.filter(c => c.status !== 'PAID')

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-muted hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <div className="flex items-center gap-2">
          {client.cvuId && (
            <Button
              variant="secondary"
              size="sm"
              loading={isSyncing}
              onClick={handleSyncPayments}
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar pagos
            </Button>
          )}
          <Link href={`/clients/${clientId}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Client header */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-syne text-3xl font-bold text-white">{client.name}</h1>
              <Badge variant={client.billingType === 'AFIP' ? 'default' : 'secondary'}>
                {getBillingTypeLabel(client.billingType)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
              {client.cuit && (
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  CUIT: {client.cuit}
                </span>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="hover:text-accent transition-colors">
                  ✉ {client.email}
                </a>
              )}
              {client.whatsapp && (
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-400 transition-colors"
                >
                  📱 {client.whatsapp}
                </a>
              )}
            </div>
            {client.cvu && (
              <div className="mt-3 inline-flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted uppercase tracking-wide">CVU:</span>
                <span className="text-sm font-mono text-accent">{formatCVU(client.cvu)}</span>
                {client.alias && <span className="text-xs text-muted">/ {client.alias}</span>}
              </div>
            )}
            {client.notes && (
              <p className="mt-3 text-sm text-muted italic">{client.notes}</p>
            )}
          </div>

          {/* Balance */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted uppercase tracking-wider">Saldo</p>
            <p className={`text-4xl font-bold font-syne mt-1 ${balanceColor}`}>
              {formatCurrency(Math.abs(client.balance))}
            </p>
            {client.balance > 0 && <p className="text-xs text-red-400 mt-0.5">debe</p>}
            {client.balance < 0 && <p className="text-xs text-green-400 mt-0.5">a favor</p>}
            {client.balance === 0 && <p className="text-xs text-green-400 mt-0.5">al día</p>}
            <div className="mt-3 text-xs text-muted space-y-0.5">
              <p>Facturado: {formatCurrency(client.totalCharged)}</p>
              <p>Cobrado: {formatCurrency(client.totalPaid)}</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowChargeModal(true)}>
            <Plus className="w-4 h-4" />
            Cargo
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowPaymentModal(true)}>
            <CreditCard className="w-4 h-4" />
            Pago
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowInvoiceModal(true)}>
            <Receipt className="w-4 h-4" />
            Factura
          </Button>
          {client.whatsapp && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotifyTarget(null)
                setShowNotifyModal(true)
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Solicitar pago WA
            </Button>
          )}
          {client.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNotify('EMAIL')}
            >
              <Mail className="w-4 h-4" />
              Solicitar pago Email
            </Button>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Charges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-syne text-lg font-bold text-white">Cargos</h2>
            <Button size="sm" onClick={() => setShowChargeModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {client.charges.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                Sin cargos registrados
              </div>
            ) : (
              <div className="divide-y divide-border">
                {client.charges.map((charge) => (
                  <div key={charge.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ChargeStatusBadge status={charge.status} />
                          {charge.invoice && (
                            <a
                              href={`/api/invoices/${charge.invoice.id}/pdf`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                            >
                              <Receipt className="w-3 h-3" />
                              {charge.invoice.type.replace('_', ' ')}
                              {charge.invoice.number ? ` #${charge.invoice.number}` : ''}
                            </a>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white mt-1 truncate">
                          {charge.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                          <span>{formatDate(charge.date)}</span>
                          {charge.dueDate && (
                            <span className={isOverdue(charge.dueDate, charge.status) ? 'text-red-400' : ''}>
                              Vence: {formatDate(charge.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(Number(charge.amount))}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          {client.whatsapp && charge.status !== 'PAID' && (
                            <button
                              onClick={() => handleNotify('WHATSAPP', charge.id)}
                              className="text-muted hover:text-green-400 transition-colors"
                              title="Notificar por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {client.email && charge.status !== 'PAID' && (
                            <button
                              onClick={() => handleNotify('EMAIL', charge.id)}
                              className="text-muted hover:text-accent transition-colors"
                              title="Notificar por Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-syne text-lg font-bold text-white">Pagos</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowPaymentModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </Button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {client.payments.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                Sin pagos registrados
              </div>
            ) : (
              <div className="divide-y divide-border">
                {client.payments.map((payment) => (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="text-xs">
                            {getPaymentMethodLabel(payment.method)}
                          </Badge>
                          {payment.externalId && (
                            <span className="text-xs text-muted">Automático</span>
                          )}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {formatDate(payment.date)}
                          {payment.reference && ` · Ref: ${payment.reference}`}
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-2 mt-1 truncate">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-green-400 flex-shrink-0">
                        +{formatCurrency(Number(payment.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices */}
      {client.invoices.length > 0 && (
        <div>
          <h2 className="font-syne text-lg font-bold text-white mb-3">Facturas</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {client.invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {invoice.type.replace('_', ' ')}
                      </Badge>
                      {invoice.number && (
                        <span className="text-xs text-muted">N° {invoice.number}</span>
                      )}
                      {invoice.cae && (
                        <span className="text-xs text-green-400">CAE ✓</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(Number(invoice.total))}
                    </p>
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      className="text-muted hover:text-accent transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notification logs */}
      {client.notificationLogs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
          >
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Historial de notificaciones ({client.notificationLogs.length})
          </button>
          {showLogs && (
            <div className="mt-3 bg-surface border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {client.notificationLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                    <Badge
                      variant={log.channel === 'WHATSAPP' ? 'success' : 'default'}
                      className="text-xs flex-shrink-0 mt-0.5"
                    >
                      {log.channel}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-2 truncate">{log.message.substring(0, 100)}</p>
                      <p className="text-xs text-muted mt-0.5">{formatDate(log.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <Badge
                      variant={log.status === 'sent' ? 'secondary' : 'destructive'}
                      className="text-xs flex-shrink-0"
                    >
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddChargeModal
        open={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        clientId={clientId}
        onSuccess={() => { setShowChargeModal(false); mutate() }}
      />

      <AddPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        clientId={clientId}
        pendingCharges={pendingCharges}
        onSuccess={() => { setShowPaymentModal(false); mutate() }}
      />

      <CreateInvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        client={client}
        onSuccess={() => { setShowInvoiceModal(false); mutate() }}
      />

      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar cliente"
        description={`¿Estás seguro que querés eliminar a ${client.name}? Esta acción no se puede deshacer.`}
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function ChargeStatusBadge({ status }: { status: ChargeStatus }) {
  const variants: Record<ChargeStatus, 'success' | 'warning' | 'destructive'> = {
    PAID: 'success',
    PARTIAL: 'warning',
    PENDING: 'destructive',
  }
  return (
    <Badge variant={variants[status]} className="text-xs">
      {getStatusLabel(status)}
    </Badge>
  )
}

function isOverdue(dueDate: string, status: ChargeStatus): boolean {
  if (status === 'PAID') return false
  return new Date(dueDate) < new Date()
}

// ---- Add Charge Modal ----
function AddChargeModal({
  open, onClose, clientId, onSuccess,
}: {
  open: boolean; onClose: () => void; clientId: string; onSuccess: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      toast({ type: 'success', title: 'Cargo agregado' })
      setForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], dueDate: '', notes: '' })
      onSuccess()
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Agregar cargo" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Descripción"
          placeholder="Gestión de redes sociales - Noviembre 2024"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto (ARS)"
            type="number"
            placeholder="150000"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Fecha"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <Input
          label="Fecha de vencimiento (opcional)"
          type="date"
          value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
        />
        <Textarea
          label="Notas (opcional)"
          placeholder="Detalles adicionales..."
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Agregar cargo</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

// ---- Add Payment Modal ----
function AddPaymentModal({
  open, onClose, clientId, pendingCharges, onSuccess,
}: {
  open: boolean; onClose: () => void; clientId: string
  pendingCharges: Charge[]; onSuccess: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'CVU' as string,
    reference: '',
    notes: '',
  })
  const [selectedCharges, setSelectedCharges] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          chargeIds: selectedCharges.length > 0 ? selectedCharges : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      toast({ type: 'success', title: 'Pago registrado' })
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'CVU', reference: '', notes: '' })
      setSelectedCharges([])
      onSuccess()
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar pago" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto (ARS)"
            type="number"
            placeholder="75000"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Fecha"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <Select
          label="Método de pago"
          value={form.method}
          onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
          options={[
            { value: 'CVU', label: 'Transferencia CVU' },
            { value: 'CASH', label: 'Efectivo' },
            { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
            { value: 'OTHER', label: 'Otro' },
          ]}
        />
        <Input
          label="Referencia (opcional)"
          placeholder="Comprobante N° 12345"
          value={form.reference}
          onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
        />
        <Textarea
          label="Notas (opcional)"
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />

        {pendingCharges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-2 uppercase tracking-wider mb-2">
              Imputar a cargos (opcional)
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {pendingCharges.map(charge => (
                <label key={charge.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCharges.includes(charge.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedCharges(prev => [...prev, charge.id])
                      } else {
                        setSelectedCharges(prev => prev.filter(id => id !== charge.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-border bg-surface-2 text-accent"
                  />
                  <span className="text-sm text-white flex-1 truncate">{charge.description}</span>
                  <span className="text-sm font-medium text-yellow-400 flex-shrink-0">
                    {formatCurrency(Number(charge.amount))}
                  </span>
                </label>
              ))}
            </div>
            {selectedCharges.length === 0 && (
              <p className="text-xs text-muted mt-1">
                Si no seleccionás cargos, el pago se imputará automáticamente a los más antiguos.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Registrar pago</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

// ---- Create Invoice Modal ----
function CreateInvoiceModal({
  open, onClose, client, onSuccess,
}: {
  open: boolean; onClose: () => void; client: ClientDetail; onSuccess: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([
    { description: '', quantity: 1, unitPrice: '', ivaRate: 0, subtotal: 0 },
  ])
  const [invoiceType, setInvoiceType] = useState(
    client.billingType === 'AFIP' ? 'AFIP_B' : 'COMMON'
  )
  const [dueDate, setDueDate] = useState('')

  const updateItem = (i: number, field: string, value: string | number) => {
    setItems(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      // Recalculate subtotal
      const qty = field === 'quantity' ? Number(value) : Number(next[i].quantity)
      const price = field === 'unitPrice' ? Number(value) : Number(next[i].unitPrice)
      next[i].subtotal = qty * price
      return next
    })
  }

  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  const iva = items.reduce((sum, item) => {
    if (item.ivaRate === 21) return sum + (item.subtotal || 0) * 0.21
    return sum
  }, 0)
  const total = subtotal + iva

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: invoiceType,
          items: items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
          subtotal,
          iva,
          total,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear factura')
      toast({ type: 'success', title: 'Factura creada', description: data.cae ? `CAE: ${data.cae}` : undefined })
      onSuccess()
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Crear factura" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de factura"
            value={invoiceType}
            onChange={e => setInvoiceType(e.target.value)}
            options={[
              { value: 'COMMON', label: 'Factura Común (PDF)' },
              ...(client.billingType === 'AFIP' && client.cuit ? [
                { value: 'AFIP_B', label: 'Factura B (AFIP)' },
                { value: 'AFIP_C', label: 'Factura C (AFIP)' },
              ] : []),
            ]}
          />
          <Input
            label="Vencimiento (opcional)"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-2 uppercase tracking-wider">Ítems</p>
            <button
              type="button"
              onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: '', ivaRate: 0, subtotal: 0 }])}
              className="text-xs text-accent hover:underline"
            >
              + Agregar ítem
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_100px_80px_80px_32px] gap-2 items-end">
                <Input
                  placeholder="Descripción del servicio"
                  value={item.description}
                  onChange={e => updateItem(i, 'description', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  placeholder="Cant"
                  value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  min="1"
                  required
                />
                <Input
                  type="number"
                  placeholder="Precio"
                  value={item.unitPrice}
                  onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
                <Select
                  value={String(item.ivaRate)}
                  onChange={e => updateItem(i, 'ivaRate', Number(e.target.value))}
                  options={[
                    { value: '0', label: 'Exento' },
                    { value: '21', label: 'IVA 21%' },
                  ]}
                />
                <div className="text-sm text-white font-medium py-2">
                  {formatCurrency(item.subtotal)}
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                    className="text-muted hover:text-red-400 transition-colors pb-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-surface-2 rounded-lg p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-white">{formatCurrency(subtotal)}</span>
          </div>
          {iva > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">IVA (21%)</span>
              <span className="text-white">{formatCurrency(iva)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
            <span className="text-white">Total</span>
            <span className="text-accent">{formatCurrency(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>
            {invoiceType === 'COMMON' ? 'Generar PDF' : 'Emitir AFIP'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
