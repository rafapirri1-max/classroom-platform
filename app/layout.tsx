import './globals.css'

export const metadata = {
  title: 'Classroom Platform',
  description: 'Interactive learning games for students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">{children}</body>
    </html>
  )
}
