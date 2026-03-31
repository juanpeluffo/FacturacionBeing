'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Users,
  RefreshCw,
  MessageCircle,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { formatCurrency, buildWhatsAppLink } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface KPIs {
  allTime: { totalCharged: number; totalPaid: number; totalPending: number }
  thisMonth: { totalCharged: number; totalPaid: number }
}

interface OverdueClient {
  client: { id: string; name: string; whatsapp?: string; email?: string }
  totalOverdue: number
  chargeCount: number
}

interface DashboardData {
  kpis: KPIs
  overdueClients: OverdueClient[]
  chartData: Array<{ month: string; facturado: number; cobrado: number }>
  recentActivity: Array<{
    id: string
    description: string
    amount: number
    date: string
    status: string
    client: { id: string; name: string }
  }>
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'month' | 'allTime'>('month')
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/dashboard', fetcher)

  const kpis = data?.kpis
  const currentKpis = period === 'month' ? kpis?.thisMonth : kpis?.allTime

  const handleNotify = async (clientId: string, channel: 'WHATSAPP' | 'EMAIL', whatsapp?: string) => {
    if (channel === 'WHATSAPP' && whatsapp) {
      // Generate wa.me link first, then try API
      const result = await fetch(`/api/clients/${clientId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'WHATSAPP' }),
      })
      const json = await result.json()
      if (json.waLink) {
        window.open(json.waLink, '_blank')
      } else if (json.success) {
        toast({ type: 'success', title: 'Notificación enviada por WhatsApp' })
      } else {
        toast({ type: 'error', title: 'Error al enviar notificación', description: json.error })
      }
      return
    }

    const result = await fetch(`/api/clients/${clientId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel }),
    })
    const json = await result.json()
    if (json.success || json.emailId) {
      toast({ type: 'success', title: 'Notificación enviada por email' })
    } else {
      toast({ type: 'error', title: 'Error', description: json.error })
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Resumen de facturación y cobranzas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-2 border border-border rounded-lg p-1 gap-1">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === 'month'
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-white'
              }`}
            >
              Este mes
            </button>
            <button
              onClick={() => setPeriod('allTime')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === 'allTime'
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-white'
              }`}
            >
              Acumulado
            </button>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => mutate()}
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Facturado"
          value={isLoading ? null : (currentKpis as typeof kpis.allTime)?.totalCharged ?? 0}
          icon={TrendingUp}
          iconColor="text-accent"
          loading={isLoading}
        />
        <KPICard
          title="Total Cobrado"
          value={isLoading ? null : (currentKpis as typeof kpis.allTime)?.totalPaid ?? 0}
          icon={DollarSign}
          iconColor="text-green-400"
          loading={isLoading}
        />
        <KPICard
          title="Pendiente de Cobro"
          value={isLoading ? null : (period === 'allTime' ? kpis?.allTime.totalPending : (kpis?.thisMonth.totalCharged ?? 0) - (kpis?.thisMonth.totalPaid ?? 0)) ?? 0}
          icon={TrendingDown}
          iconColor="text-yellow-400"
          loading={isLoading}
          highlight
        />
        <KPICard
          title="Clientes en Rojo"
          value={isLoading ? null : data?.overdueClients.length ?? 0}
          icon={AlertTriangle}
          iconColor="text-red-400"
          loading={isLoading}
          isCurrency={false}
          suffix="clientes"
        />
      </div>

      {/* Chart + Overdue clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Facturado vs Cobrado</CardTitle>
            <p className="text-xs text-muted mt-1">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="text-muted text-sm">Cargando...</div>
              </div>
            ) : (
              <RevenueChart data={data?.chartData ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Overdue clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Clientes en Rojo</CardTitle>
              <Badge variant="destructive">{data?.overdueClients.length ?? 0}</Badge>
            </div>
            <p className="text-xs text-muted mt-1">Saldos vencidos</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-muted text-sm">Cargando...</div>
            ) : data?.overdueClients.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">🟢</div>
                <p className="text-sm text-muted">Sin clientes con saldo vencido</p>
              </div>
            ) : (
              data?.overdueClients.map(({ client, totalOverdue, chargeCount }) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border hover:border-border-2 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">
                      {chargeCount} cargo{chargeCount !== 1 ? 's' : ''} vencido{chargeCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-red-400">{formatCurrency(totalOverdue)}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {client.whatsapp && (
                        <button
                          onClick={() => handleNotify(client.id, 'WHATSAPP', client.whatsapp)}
                          className="text-muted hover:text-green-400 transition-colors"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {client.email && (
                        <button
                          onClick={() => handleNotify(client.id, 'EMAIL')}
                          className="text-muted hover:text-accent transition-colors"
                          title="Enviar Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-muted hover:text-white transition-colors"
                        title="Ver cliente"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Actividad Reciente</CardTitle>
              <Link href="/clients">
                <Button variant="ghost" size="sm">Ver todos →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentActivity.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center gap-4 py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/clients/${charge.client.id}`}
                      className="text-sm text-accent hover:underline font-medium"
                    >
                      {charge.client.name}
                    </Link>
                    <p className="text-xs text-muted truncate mt-0.5">{charge.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{formatCurrency(charge.amount)}</p>
                    <StatusBadge status={charge.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KPICard({
  title,
  value,
  icon: Icon,
  iconColor,
  loading,
  highlight,
  isCurrency = true,
  suffix,
}: {
  title: string
  value: number | null
  icon: React.ElementType
  iconColor: string
  loading: boolean
  highlight?: boolean
  isCurrency?: boolean
  suffix?: string
}) {
  return (
    <Card className={highlight && value && value > 0 ? 'border-yellow-400/20' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">{title}</p>
            <div className="mt-2">
              {loading || value === null ? (
                <div className="h-8 w-28 bg-surface-2 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold font-syne text-white">
                  {isCurrency ? formatCurrency(value) : value}
                  {suffix && (
                    <span className="text-sm font-normal text-muted ml-1">{suffix}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className={`p-2 rounded-lg bg-surface-2 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    PAID: 'success',
    PARTIAL: 'warning',
    PENDING: 'destructive',
  }
  const labels: Record<string, string> = {
    PAID: 'Pagado',
    PARTIAL: 'Parcial',
    PENDING: 'Pendiente',
  }
  return (
    <Badge variant={variants[status] || 'secondary'} className="text-xs mt-0.5">
      {labels[status] || status}
    </Badge>
  )
}
