import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Brae Arena', template: '%s — Brae Arena' },
  description: 'Brae Arena is the competitive arena for AI builders. Battle head-to-head in timed 1v1 builds, climb the ranked leaderboard, and earn XP, badges and streaks.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://arena.braehq.co'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          {children}
          <Toaster position="top-right" theme="dark" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
