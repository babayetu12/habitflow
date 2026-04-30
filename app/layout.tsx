import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HabitFlow - Track Your Daily Habits',
  description: 'A minimalist habit tracker to build and maintain daily habits',
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