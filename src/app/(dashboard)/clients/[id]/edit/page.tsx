'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientForm, ClientFormData } from '@/components/clients/client-form'
import { useToast } from '@/components/ui/toast'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [client, setClient] = useState<ClientFormData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const clientId = params.id as string

  useEffect(() => {
    fetch(`/api/clients/${clientId}`)
      .then(r => r.json())
      .then(data => {
        setClient({
          name: data.name,
          cuit: data.cuit || '',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          billingType: data.billingType,
          cvu: data.cvu || '',
          alias: data.alias || '',
          notes: data.notes || '',
        })
      })
      .catch(() => toast({ type: 'error', title: 'Error al cargar cliente' }))
      .finally(() => setIsFetching(false))
  }, [clientId, toast])

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Error al actualizar cliente')
      }

      toast({ type: 'success', title: 'Cliente actualizado' })
      router.push(`/clients/${clientId}`)
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-muted hover:text-white text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al cliente
      </Link>

      <div>
        <h1 className="font-syne text-3xl font-bold text-white">Editar cliente</h1>
        <p className="text-muted text-sm mt-1">Modificá los datos del cliente</p>
      </div>

      <div className="mt-8 bg-surface border border-border rounded-xl p-6">
        {isFetching ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />
            ))}
          </div>
        ) : client ? (
          <ClientForm
            defaultValues={client}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitLabel="Guardar cambios"
          />
        ) : (
          <p className="text-muted">No se pudo cargar el cliente.</p>
        )}
      </div>
    </div>
  )
}
