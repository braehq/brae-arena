import { Header } from '@/components/layout/header'

// Agents pages are public (no auth required to browse)
// Individual actions (create, edit, queue) have their own auth checks
export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14">
        {children}
      </main>
    </div>
  )
}
