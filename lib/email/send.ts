import { resend, FROM } from './client'
import {
  matchFoundEmail, type MatchFoundData,
  matchResultEmail, type MatchResultData,
  rankUpEmail, type RankUpData,
  teamInviteEmail, type TeamInviteData,
} from './templates'

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping')
    return
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[email] send failed:', error.message)
}

export async function sendMatchFound(to: string, data: MatchFoundData) {
  const { subject, html } = matchFoundEmail(data)
  await send(to, subject, html)
}

export async function sendMatchResult(to: string, data: MatchResultData) {
  const { subject, html } = matchResultEmail(data)
  await send(to, subject, html)
}

export async function sendRankUp(to: string, data: RankUpData) {
  const { subject, html } = rankUpEmail(data)
  await send(to, subject, html)
}

export async function sendTeamInvite(to: string, data: TeamInviteData) {
  const { subject, html } = teamInviteEmail(data)
  await send(to, subject, html)
}
