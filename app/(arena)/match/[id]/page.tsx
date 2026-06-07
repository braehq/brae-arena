import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { MatchRoom } from './_components/match-room'
import { MatchRoomCode } from '@/components/arena/match-room-code'
import { MatchRoomRegex } from '@/components/arena/match-room-regex'
import { MatchRoomCssGolf } from '@/components/arena/match-room-css-golf'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://arena.braehq.co'
  const ogImage = `${appUrl}/api/og/match/${id}`
  return {
    title: 'Match — Brae Arena',
    openGraph: {
      title: 'Brae Arena — 1v1 Live Match',
      description: 'Watch the result of this 1v1 coding battle on Brae Arena.',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  }
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Auth check with user client (respects RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch match data with service client — profiles RLS would block reading
  // the opponent's row with the regular client
  const service = createServiceClient()

  const [{ data: match }, { data: challenge }] = await Promise.all([
    service.from('arena_matches').select('*').eq('id', id).single(),
    service.from('arena_matches').select('challenge:arena_challenges(*, challenge_type, starter_code, language, test_cases, target_image_url)').eq('id', id).single(),
  ])

  if (!match) {
    console.error('[match page] match not found, id:', id)
    notFound()
  }

  // Verify this user is in the match
  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    redirect('/lobby')
  }

  // Fetch profiles and submissions separately (no cross-schema FK join)
  const [{ data: p1Profile }, { data: p2Profile }, { data: submissions }] = await Promise.all([
    service.from('profiles').select('id, username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_one_id).single(),
    service.from('profiles').select('id, username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_two_id).single(),
    service.from('arena_submissions').select('*').eq('match_id', id),
  ])

  const matchWithProfiles = {
    ...match,
    challenge: (challenge as { challenge?: unknown } | null)?.challenge ?? null,
    player_one: p1Profile,
    player_two: p2Profile,
  }

  const challengeData = (challenge as { challenge?: { challenge_type?: string; solution_code?: string | null } } | null)?.challenge
  const challengeType = challengeData?.challenge_type

  // CSS Golf — self-contained engine. Strip the reference solution before it reaches the
  // client; pass only its length as `par` for the golf meter.
  if (challengeType === 'css_golf') {
    const solution = challengeData?.solution_code ?? null
    const safeChallenge = { ...(challengeData as Record<string, unknown>) }
    delete safeChallenge.solution_code
    const cssGolfMatch = {
      ...matchWithProfiles,
      challenge: { ...safeChallenge, parLength: typeof solution === 'string' ? solution.length : null },
    }
    return (
      <MatchRoomCssGolf
        match={cssGolfMatch as Parameters<typeof MatchRoomCssGolf>[0]['match']}
        currentUserId={user!.id}
        initialSubmissions={submissions ?? []}
      />
    )
  }

  // Regex Duel — self-contained engine. Strip the reference solution before it reaches the
  // client; pass only its length as `par` for the golf meter.
  if (challengeType === 'regex_duel') {
    const solution = challengeData?.solution_code ?? null
    const safeChallenge = { ...(challengeData as Record<string, unknown>) }
    delete safeChallenge.solution_code
    const regexMatch = {
      ...matchWithProfiles,
      challenge: { ...safeChallenge, parLength: typeof solution === 'string' ? solution.length : null },
    }
    return (
      <MatchRoomRegex
        match={regexMatch as Parameters<typeof MatchRoomRegex>[0]['match']}
        currentUserId={user!.id}
        initialSubmissions={submissions ?? []}
      />
    )
  }

  const isCodeChallenge = challengeType && challengeType !== 'url_submit'

  if (isCodeChallenge) {
    return (
      <MatchRoomCode
        match={matchWithProfiles as Parameters<typeof MatchRoomCode>[0]['match']}
        currentUserId={user!.id}
        initialSubmissions={submissions ?? []}
      />
    )
  }

  return (
    <MatchRoom
      match={matchWithProfiles}
      currentUserId={user!.id}
      initialSubmissions={submissions ?? []}
    />
  )
}
