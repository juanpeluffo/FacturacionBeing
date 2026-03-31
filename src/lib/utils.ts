import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0,00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: Date | string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

export function isOverdue(dueDate: Date | string | null | undefined): boolean {
  if (!dueDate) return false
  const d = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return isBefore(d, new Date())
}

export function getBalanceColor(balance: number): string {
  if (balance <= 0) return 'text-green-400'
  if (balance > 0) return 'text-red-400'
  return 'text-yellow-400'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'PAID': return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'PARTIAL': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'PENDING': return 'text-red-400 bg-red-400/10 border-red-400/20'
    default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'PAID': return 'Pagado'
    case 'PARTIAL': return 'Parcial'
    case 'PENDING': return 'Pendiente'
    case 'DRAFT': return 'Borrador'
    case 'SENT': return 'Enviado'
    case 'CANCELLED': return 'Cancelado'
    default: return status
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CVU': return 'Transferencia CVU'
    case 'CASH': return 'Efectivo'
    case 'BANK_TRANSFER': return 'Transferencia bancaria'
    case 'OTHER': return 'Otro'
    default: return method
  }
}

export function getBillingTypeLabel(type: string): string {
  switch (type) {
    case 'AFIP': return 'Factura AFIP'
    case 'COMMON': return 'Factura Común'
    default: return type
  }
}

export function getLast6Months(): { label: string; start: Date; end: Date }[] {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    months.push({
      label: format(date, 'MMM yyyy', { locale: es }),
      start: startOfMonth(date),
      end: endOfMonth(date),
    })
  }
  return months
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function formatCVU(cvu: string | null | undefined): string {
  if (!cvu) return '-'
  // Format CVU as groups for readability
  return cvu.replace(/(.{3})(.{3})(.{11})(.{1})(.{3})(.{1})/, '$1 $2 $3 $4 $5 $6')
}

export function validateCUIT(cuit: string): boolean {
  const clean = cuit.replace(/[-\s]/g, '')
  if (clean.length !== 11) return false
  const nums = clean.split('').map(Number)
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = mult.reduce((acc, m, i) => acc + m * nums[i], 0)
  const mod = sum % 11
  const verifier = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod
  return verifier === nums[10]
}
