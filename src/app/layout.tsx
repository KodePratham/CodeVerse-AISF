import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pangat AI - Intelligent Solutions for Tomorrow',
  description: 'Transform your business with cutting-edge AI technology. Pangat AI delivers intelligent automation, insights, and innovation.',
  keywords: 'AI, Artificial Intelligence, Machine Learning, Automation, Technology',
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
