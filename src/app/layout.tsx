import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CuentaCorriente',
    template: '%s | CuentaCorriente',
  },
  description: 'Sistema de facturación y cuentas corrientes para agencia digital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${syne.variable} font-inter bg-black`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
