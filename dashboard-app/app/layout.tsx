import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PNNCLE Test Dashboard',
  description: 'View and analyze PNNCLE automation test results',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

