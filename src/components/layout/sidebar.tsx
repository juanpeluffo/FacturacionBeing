'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const AGENCY_NAME = process.env.NEXT_PUBLIC_AGENCY_NAME || 'CuentaCorriente'

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Clientes',
    href: '/clients',
    icon: Users,
  },
  {
    label: 'Facturas',
    href: '/invoices',
    icon: Receipt,
  },
  {
    label: 'Registrar Pago',
    href: '/payments/new',
    icon: CreditCard,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <h1 className="font-syne text-xl font-bold tracking-tight">
          <span className="text-white">Cuenta</span>
          <span className="text-accent">Corriente</span>
        </h1>
        <p className="text-xs text-muted mt-0.5 truncate">{AGENCY_NAME}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-accent text-black'
                  : 'text-muted-2 hover:text-white hover:bg-surface-2'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? 'text-black' : 'text-muted group-hover:text-white'
                )}
              />
              {item.label}
              {isActive && (
                <ChevronRight className="w-3 h-3 ml-auto text-black/60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-2 hover:text-white hover:bg-surface-2 transition-all w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-muted" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
