import { getActivityById } from '@/lib/activity-engine'
import { NextResponse } from 'next/server'

type RouteContext = { params: { id: string } }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const activity = await getActivityById(context.params.id)
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    return NextResponse.json({ activity })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
