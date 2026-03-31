'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Client {
  id: string
  name: string
  balance: number
  charges: Array<{
    id: string
    description: string
    amount: number
    status: string
    date: string
  }>
}

interface Charge {
  id: string
  description: string
  amount: number | string
  status: string
  date: string
}

export default function NewPaymentPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [pendingCharges, setPendingCharges] = useState<Charge[]>([])
  const [selectedCharges, setSelectedCharges] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'CVU',
    reference: '',
    notes: '',
  })

  // Search clients
  useEffect(() => {
    if (clientSearch.length < 2) {
      setClients([])
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=10`)
        const data = await res.json()
        setClients(data.clients || [])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch])

  // Load pending charges when client selected
  useEffect(() => {
    if (!selectedClient) return
    fetch(`/api/clients/${selectedClient.id}/charges`)
      .then(r => r.json())
      .then((charges: Charge[]) => {
        setPendingCharges(charges.filter(c => c.status !== 'PAID'))
      })
  }, [selectedClient])

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(client.name)
    setClients([])
    setSelectedCharges([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) {
      toast({ type: 'error', title: 'Seleccioná un cliente' })
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          chargeIds: selectedCharges.length > 0 ? selectedCharges : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar pago')
      }

      toast({ type: 'success', title: 'Pago registrado exitosamente' })
      router.push(`/clients/${selectedClient.id}`)
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-muted hover:text-white text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <div>
        <h1 className="font-syne text-3xl font-bold text-white">Registrar pago</h1>
        <p className="text-muted text-sm mt-1">Ingresá un pago manual de un cliente</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Client selection */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-4">Cliente</h3>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre..."
              value={clientSearch}
              onChange={e => {
                setClientSearch(e.target.value)
                if (!e.target.value) setSelectedClient(null)
              }}
              className="w-full bg-surface-2 border border-border text-white placeholder-muted rounded-md pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {/* Dropdown */}
          {clients.length > 0 && (
            <div className="mt-1 bg-surface-2 border border-border rounded-lg overflow-hidden shadow-lg">
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-3 transition-colors border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-white">{client.name}</p>
                  <p className={`text-xs mt-0.5 ${client.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    Saldo: {formatCurrency(Math.abs(client.balance))}
                    {client.balance > 0 ? ' (debe)' : ' (a favor)'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedClient && (
            <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{selectedClient.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Saldo pendiente:{' '}
                    <span className="text-red-400 font-medium">
                      {formatCurrency(selectedClient.balance > 0 ? selectedClient.balance : 0)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch(''); setSelectedCharges([]) }}
                  className="text-muted hover:text-white text-xs"
                >
                  Cambiar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payment details */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider">Datos del pago</h3>

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
            placeholder="Comprobante N° 12345, CBU, etc."
            value={form.reference}
            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
          />

          <Textarea
            label="Notas (opcional)"
            placeholder="Información adicional del pago"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {/* Charge reconciliation */}
        {selectedClient && pendingCharges.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-4">
              Imputar a cargos (opcional)
            </h3>
            <div className="space-y-2">
              {pendingCharges.map(charge => (
                <label key={charge.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-surface-2 transition-colors">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{charge.description}</p>
                    <p className="text-xs text-muted">{formatDate(charge.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={charge.status === 'PARTIAL' ? 'warning' : 'destructive'} className="text-xs">
                      {charge.status === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                    </Badge>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(Number(charge.amount))}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {selectedCharges.length === 0 && (
              <p className="text-xs text-muted mt-2">
                Si no seleccionás cargos, el pago se imputará automáticamente a los más antiguos.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/clients" className="flex-1">
            <Button type="button" variant="secondary" className="w-full">Cancelar</Button>
          </Link>
          <Button type="submit" loading={isLoading} className="flex-1" disabled={!selectedClient}>
            Registrar pago
          </Button>
        </div>
      </form>
    </div>
  )
}
