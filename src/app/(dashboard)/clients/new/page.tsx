'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientForm, ClientFormData } from '@/components/clients/client-form'
import { useToast } from '@/components/ui/toast'

export default function NewClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Error al crear cliente')
      }

      const client = await res.json()
      toast({ type: 'success', title: 'Cliente creado exitosamente' })
      router.push(`/clients/${client.id}`)
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-muted hover:text-white text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a clientes
      </Link>

      <div>
        <h1 className="font-syne text-3xl font-bold text-white">Nuevo cliente</h1>
        <p className="text-muted text-sm mt-1">Completá los datos del cliente</p>
      </div>

      <div className="mt-8 bg-surface border border-border rounded-xl p-6">
        <ClientForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          submitLabel="Crear cliente"
          showCreateCVU
        />
      </div>
    </div>
  )
}
