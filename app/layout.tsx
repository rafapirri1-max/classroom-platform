import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Classroom Platform',
  description: 'Interactive learning platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950">
        {children}
      </body>
    </html>
  )
}
