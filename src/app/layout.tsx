import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Colony - Automated Multi-Sheet Consolidation & Reporting',
  description: 'Eliminate repetitive manual reporting. Colony automatically consolidates multiple Excel sheets and CSV files into unified reports, then instantly distributes them to stakeholders. End errors and delays in daily reporting workflows.',
  keywords: 'Excel consolidation, multi-sheet reporting, automated reporting, spreadsheet automation, CSV merger, report distribution, stakeholder sharing',
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
