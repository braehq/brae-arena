import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM, APP_URL } from '@/lib/email/client'

export async function POST(request: NextRequest) {
  const key = request.headers.get('x-internal-key')
  if (key !== process.env.BRAE_INTERNAL_API_KEY) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to, followerName, targetName } = await request.json()
  if (!to) return NextResponse.json({ error: 'missing to' }, { status: 400 })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${followerName} is now following you on Brae Arena`,
    html: `<!DOCTYPE html><html><body style="background:#0a0a0f;color:#f4f4f5;font-family:system-ui;padding:40px 20px;max-width:480px;margin:0 auto">
      <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;text-align:center">
        <div style="background:#6366f1;border-radius:8px;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
          <span style="color:#fff;font-weight:700;font-size:14px">BA</span>
        </div>
        <h2 style="margin:0 0 8px;color:#f4f4f5">New follower!</h2>
        <p style="color:#a1a1aa;margin:0 0 24px"><strong style="color:#f4f4f5">${followerName}</strong> started following you on Brae Arena.</p>
        <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">View Leaderboard</a>
      </div>
      <p style="text-align:center;color:#52525b;font-size:12px;margin-top:20px">
        <a href="${APP_URL}" style="color:#6366f1;text-decoration:none">arena.braehq.co</a>
      </p>
    </body></html>`,
  })

  return NextResponse.json({ ok: true })
}
