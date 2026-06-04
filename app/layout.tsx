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
      <body>{children}</body>
    </html>
  )
}
