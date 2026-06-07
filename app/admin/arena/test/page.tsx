import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengeTestLab } from './_components/challenge-test-lab'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Challenge Test Lab' }

export default async function ChallengeTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/lobby')

  const service = createServiceClient()
  const { data: challenges } = await service
    .from('arena_challenges')
    .select('id, slug, title, description, challenge_type, difficulty, mode, starter_code, solution_code, test_cases, language, target_image_url')
    .in('challenge_type', ['code_duel', 'bug_hunt_code', 'css_golf', 'regex_duel'])
    .order('challenge_type')
    .order('difficulty')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Challenge Test Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test all code challenges with custom solutions. Verify test cases are correct before players encounter them.
        </p>
      </div>
      <ChallengeTestLab challenges={challenges ?? []} />
    </div>
  )
}
