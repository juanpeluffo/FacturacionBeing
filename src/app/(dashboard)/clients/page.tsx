'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Plus, Search, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getBillingTypeLabel } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Client {
  id: string
  name: string
  cuit?: string
  email?: string
  whatsapp?: string
  billingType: 'AFIP' | 'COMMON'
  cvu?: string
  balance: number
  totalCharged: number
  totalPaid: number
  createdAt: string
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading } = useSWR<{ clients: Client[]; total: number }>(
    `/api/clients?search=${encodeURIComponent(debouncedSearch)}`,
    fetcher
  )

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as unknown as { searchTimer: ReturnType<typeof setTimeout> }).searchTimer)
    ;(window as unknown as { searchTimer: ReturnType<typeof setTimeout> }).searchTimer = setTimeout(() => setDebouncedSearch(val), 300)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Clientes</h1>
          <p className="text-muted text-sm mt-1">
            {data?.total ?? '–'} clientes registrados
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, CUIT o email..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-surface border border-border text-white placeholder-muted rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data?.clients.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <Users className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted-2 font-medium">No hay clientes</p>
          <p className="text-muted text-sm mt-1">
            {search ? 'No se encontraron resultados para tu búsqueda' : 'Creá tu primer cliente para comenzar'}
          </p>
          {!search && (
            <Link href="/clients/new" className="mt-4 inline-block">
              <Button>
                <Plus className="w-4 h-4" />
                Crear cliente
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_160px_160px_120px_100px] gap-4 px-6 py-3 border-b border-border">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Cliente</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Facturación</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider text-right">Facturado</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider text-right">Saldo</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider text-right">Acción</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {data?.clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="grid grid-cols-[1fr_160px_160px_120px_100px] gap-4 px-6 py-4 hover:bg-surface-2 transition-colors group items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white group-hover:text-accent transition-colors truncate">
                      {client.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {client.cuit && (
                      <span className="text-xs text-muted">{client.cuit}</span>
                    )}
                    {client.email && (
                      <span className="text-xs text-muted truncate">{client.email}</span>
                    )}
                  </div>
                </div>

                <div>
                  <Badge variant={client.billingType === 'AFIP' ? 'default' : 'secondary'} className="text-xs">
                    {getBillingTypeLabel(client.billingType)}
                  </Badge>
                  {client.cvu && (
                    <p className="text-xs text-muted mt-1">CVU ✓</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-white">{formatCurrency(client.totalCharged)}</p>
                  <p className="text-xs text-muted mt-0.5">cobrado: {formatCurrency(client.totalPaid)}</p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      client.balance <= 0
                        ? 'text-green-400'
                        : client.balance > 0
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {formatCurrency(Math.abs(client.balance))}
                    {client.balance > 0 && ' debe'}
                    {client.balance < 0 && ' favor'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4 inline" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
