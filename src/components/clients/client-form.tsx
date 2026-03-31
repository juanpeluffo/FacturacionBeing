'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  cuit: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  billingType: z.enum(['AFIP', 'COMMON']),
  cvu: z.string().optional(),
  alias: z.string().optional(),
  notes: z.string().optional(),
  createCVU: z.boolean().optional(),
})

export type ClientFormData = z.infer<typeof schema>

interface ClientFormProps {
  defaultValues?: Partial<ClientFormData>
  onSubmit: (data: ClientFormData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
  showCreateCVU?: boolean
}

export function ClientForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Guardar',
  showCreateCVU = false,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billingType: 'COMMON',
      createCVU: false,
      ...defaultValues,
    },
  })

  const billingType = watch('billingType')
  const createCVU = watch('createCVU')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">Datos del cliente</h3>

        <Input
          label="Nombre / Razón social"
          placeholder="Empresa XYZ S.A."
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CUIT"
            placeholder="20-12345678-9"
            error={errors.cuit?.message}
            hint="Requerido para factura AFIP"
            {...register('cuit')}
          />
          <Select
            label="Tipo de facturación"
            options={[
              { value: 'COMMON', label: 'Factura Común' },
              { value: 'AFIP', label: 'Factura AFIP' },
            ]}
            {...register('billingType')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="contacto@empresa.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="WhatsApp"
            placeholder="+5491112345678"
            error={errors.whatsapp?.message}
            hint="Con código de país"
            {...register('whatsapp')}
          />
        </div>
      </div>

      {/* CVU */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">CVU / Cobros</h3>

        {showCreateCVU && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('createCVU')}
              className="w-4 h-4 rounded border-border bg-surface-2 text-accent focus:ring-accent focus:ring-offset-black"
            />
            <span className="text-sm text-white">
              Crear CVU automático via Talo Pay
            </span>
          </label>
        )}

        {!createCVU && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CVU"
              placeholder="0000003100027777777777"
              error={errors.cvu?.message}
              hint="22 dígitos"
              {...register('cvu')}
            />
            <Input
              label="Alias CBU"
              placeholder="nombre.banco.cvb"
              error={errors.alias?.message}
              {...register('alias')}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <Textarea
          label="Notas internas"
          placeholder="Notas sobre el cliente, condiciones especiales, etc."
          rows={3}
          {...register('notes')}
        />
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
