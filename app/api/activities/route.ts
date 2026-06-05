import { getAllActivities } from '@/lib/activity-engine'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const activities = await getAllActivities()
    return NextResponse.json({ activities })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
