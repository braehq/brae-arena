import { APP_URL } from './client'

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Brae Arena</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="padding-bottom:24px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#6366f1;border-radius:8px;width:32px;height:32px;text-align:center;line-height:32px;">
            <span style="color:#fff;font-weight:700;font-size:12px;">BA</span>
          </td>
          <td style="padding-left:10px;color:#f4f4f5;font-size:15px;font-weight:600;vertical-align:middle;">Brae Arena</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Content card -->
  <tr>
    <td style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;">
      ${content}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding-top:24px;text-align:center;color:#52525b;font-size:12px;">
      <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">arena.braehq.co</a>
      &nbsp;·&nbsp;
      <a href="${APP_URL}/settings" style="color:#52525b;text-decoration:none;">Manage notifications</a>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;margin-top:20px;">${text}</a>`
}

function tag(text: string, color = '#6366f1'): string {
  return `<span style="display:inline-block;background:${color}18;border:1px solid ${color}40;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;">${text}</span>`
}

// ─── 1. Match Found ────────────────────────────────────────────────────────────

export interface MatchFoundData {
  playerName: string
  opponentName: string
  opponentElo: number
  challengeTitle: string
  gameType: string
  mode: string
  timeLimitMins: number
  matchId: string
}

export function matchFoundEmail(data: MatchFoundData) {
  const modeTag = data.mode === 'ranked' ? tag('Ranked', '#6366f1') : tag('Casual', '#71717a')
  const gameTag = tag(data.gameType.replace(/_/g, ' '), '#0ea5e9')

  return {
    subject: `⚔️ Match found — you're up against ${data.opponentName}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f4f4f5;">Match found!</h1>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;">Your opponent is ready. You have ${data.timeLimitMins} minutes — get building.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
        <tr>
          <td style="padding-bottom:12px;">
            ${modeTag}&nbsp;${gameTag}
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Challenge</p>
            <p style="margin:0 0 16px;color:#f4f4f5;font-size:16px;font-weight:600;">${data.challengeTitle}</p>
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Opponent</p>
            <p style="margin:0;color:#f4f4f5;font-size:15px;font-weight:500;">${data.opponentName} <span style="color:#71717a;font-weight:400;">${data.opponentElo} ELO</span></p>
          </td>
        </tr>
      </table>

      ${btn('⚔️ Go to match room', `${APP_URL}/match/${data.matchId}`)}
      <p style="margin:12px 0 0;color:#52525b;font-size:12px;">Timer is already running. Don't keep them waiting.</p>
    `),
  }
}

// ─── 2. Match Result ───────────────────────────────────────────────────────────

export interface MatchResultData {
  playerName: string
  opponentName: string
  result: 'win' | 'loss' | 'draw'
  score: number
  opponentScore: number
  eloChange: number
  newElo: number
  newTier: string
  xpAwarded: number
  challengeTitle: string
  matchId: string
}

export function matchResultEmail(data: MatchResultData) {
  const resultConfig = {
    win:  { emoji: '🏆', label: 'Victory', color: '#22c55e', msg: "You outbuilt the competition." },
    loss: { emoji: '😔', label: 'Defeat',  color: '#ef4444', msg: "Close match. Shake it off and queue again." },
    draw: { emoji: '🤝', label: 'Draw',    color: '#a1a1aa', msg: "Evenly matched. Come back for the rematch." },
  }[data.result]

  const eloStr = data.eloChange >= 0 ? `+${data.eloChange}` : `${data.eloChange}`
  const eloColor = data.eloChange >= 0 ? '#22c55e' : '#ef4444'

  return {
    subject: `${resultConfig.emoji} ${resultConfig.label} — ${data.challengeTitle}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${resultConfig.color};">${resultConfig.emoji} ${resultConfig.label}</h1>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;">${resultConfig.msg}</p>

      <!-- Score comparison -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
        <tr>
          <td width="50%" style="text-align:center;padding:12px;border-right:1px solid #27272a;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;">${data.playerName}</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:${resultConfig.color};">${data.score}</p>
          </td>
          <td width="50%" style="text-align:center;padding:12px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;">${data.opponentName}</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:#f4f4f5;">${data.opponentScore}</p>
          </td>
        </tr>
      </table>

      <!-- Stats row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="text-align:center;padding:12px;background:#09090b;border:1px solid #27272a;border-radius:8px;width:33%;">
            <p style="margin:0 0 2px;color:#a1a1aa;font-size:11px;">ELO</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:${eloColor};">${eloStr}</p>
            <p style="margin:0;font-size:11px;color:#52525b;">${data.newElo} total</p>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px;background:#09090b;border:1px solid #27272a;border-radius:8px;width:33%;">
            <p style="margin:0 0 2px;color:#a1a1aa;font-size:11px;">XP</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#6366f1;">+${data.xpAwarded}</p>
          </td>
          <td style="width:8px;"></td>
          <td style="text-align:center;padding:12px;background:#09090b;border:1px solid #27272a;border-radius:8px;width:33%;">
            <p style="margin:0 0 2px;color:#a1a1aa;font-size:11px;">Rank</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#f4f4f5;text-transform:capitalize;">${data.newTier}</p>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0">
        <tr>
          <td>${btn('Queue again', `${APP_URL}/lobby`)}</td>
          <td style="padding-left:12px;">${btn('View replay', `${APP_URL}/match/${data.matchId}/replay`).replace('background:#6366f1', 'background:transparent;border:1px solid #3f3f46').replace('color:#fff', 'color:#a1a1aa')}</td>
        </tr>
      </table>
    `),
  }
}

// ─── 3. Rank Up ────────────────────────────────────────────────────────────────

export interface RankUpData {
  playerName: string
  oldTier: string
  newTier: string
  newElo: number
  xpBonus: number
}

const TIER_COLORS: Record<string, string> = {
  silver:   '#c0c0c0',
  gold:     '#ffd700',
  platinum: '#e5e4e2',
  diamond:  '#b9f2ff',
  mythic:   '#ff6b35',
}

export function rankUpEmail(data: RankUpData) {
  const color = TIER_COLORS[data.newTier] ?? '#6366f1'

  return {
    subject: `🎉 Rank up — you've reached ${data.newTier.charAt(0).toUpperCase() + data.newTier.slice(1)}!`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${color};">Rank up! 🎉</h1>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;">You've climbed from <strong style="color:#f4f4f5;text-transform:capitalize;">${data.oldTier}</strong> to the next tier. Keep climbing.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:2px solid ${color}40;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center;">
        <tr>
          <td>
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">New Rank</p>
            <p style="margin:0;font-size:36px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.05em;">${data.newTier}</p>
            <p style="margin:4px 0 0;color:#71717a;font-size:14px;">${data.newElo} ELO</p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
        <tr>
          <td style="color:#a1a1aa;font-size:14px;">Rank-up bonus XP</td>
          <td align="right" style="color:#6366f1;font-size:14px;font-weight:700;">+${data.xpBonus} XP</td>
        </tr>
      </table>

      ${btn('View my profile', `${APP_URL}/leaderboard`)}
    `),
  }
}

// ─── 4. Team Invite ────────────────────────────────────────────────────────────

export interface TeamInviteData {
  inviteeName: string
  inviterName: string
  teamName: string
  teamTag: string
  teamElo: number
  teamSlug: string
  inviteId: string
}

export function teamInviteEmail(data: TeamInviteData) {
  return {
    subject: `🛡️ You've been invited to join [${data.teamTag}] ${data.teamName}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f4f4f5;">Team invite</h1>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;"><strong style="color:#f4f4f5;">${data.inviterName}</strong> has invited you to join their team.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:8px;padding:20px;margin-bottom:20px;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="display:inline-block;background:#6366f120;border:1px solid #6366f140;border-radius:6px;padding:4px 10px;font-size:13px;font-weight:700;color:#6366f1;margin-bottom:8px;">[${data.teamTag}]</div>
            <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#f4f4f5;">${data.teamName}</p>
            <p style="margin:0;color:#71717a;font-size:14px;">${data.teamElo} Team ELO</p>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0">
        <tr>
          <td>${btn('✓ Accept invite', `${APP_URL}/teams/invites`)}</td>
        </tr>
      </table>
      <p style="margin:12px 0 0;color:#52525b;font-size:12px;">Or go to <a href="${APP_URL}/teams/invites" style="color:#6366f1;text-decoration:none;">your invites page</a> to review.</p>
    `),
  }
}
