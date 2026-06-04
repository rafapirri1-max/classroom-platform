import { NextResponse } from 'next/server'
import { getAllGames } from '@/lib/game-registry'

export async function GET() {
  try {
    const games = await getAllGames()
    return NextResponse.json({ games })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
