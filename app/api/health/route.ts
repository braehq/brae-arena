import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', app: 'brae-arena', ts: new Date().toISOString() })
}
