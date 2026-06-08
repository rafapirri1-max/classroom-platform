import { getHubProgressSummary } from '@/lib/mini-game-progress'
import type { GameSessionRow } from '@/lib/session-lifecycle'

export function HubProgressLabel({ rawData }: { rawData: unknown }) {
  const summary = getHubProgressSummary(rawData)
  if (!summary) {
    return <span className="text-gray-500 text-sm">Started — no mini-games yet</span>
  }
  return (
    <span className="text-amber-300 text-sm font-medium">{summary.progressLabel} completed</span>
  )
}

export function HubProgressBar({ rawData }: { rawData: unknown }) {
  const summary = getHubProgressSummary(rawData)
  if (!summary) return null
  const pct =
    summary.requiredCount > 0
      ? Math.round((summary.completedCount / summary.requiredCount) * 100)
      : 0
  return (
    <div className="mt-2">
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-amber-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function HubMiniGameList({ rawData }: { rawData: unknown }) {
  const summary = getHubProgressSummary(rawData)
  if (!summary?.miniGames.length) return null
  return (
    <ul className="text-xs text-gray-400 space-y-1 mt-2">
      {summary.miniGames.map((miniGame) => (
        <li key={miniGame.miniGameId} className="flex flex-wrap gap-x-2">
          <span className="text-gray-300">{miniGame.miniGameName}</span>
          <span>{miniGame.score} pts</span>
          <span>{miniGame.accuracy}%</span>
          <span>{miniGame.timeSpent}s</span>
        </li>
      ))}
    </ul>
  )
}

export function HubProgressSessionTable({
  sessions,
  endReasonBySessionId,
}: {
  sessions: GameSessionRow[]
  endReasonBySessionId?: Record<string, string>
}) {
  if (sessions.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700/30">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Student</th>
            {endReasonBySessionId && (
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
            )}
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Progress</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Score</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Accuracy</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Mini-games</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sessions.map((session) => (
            <tr key={session.id} className="hover:bg-gray-700/30 align-top">
              <td className="px-4 py-3 text-sm font-medium">
                {session.students?.name || 'Unknown'}
              </td>
              {endReasonBySessionId && (
                <td className="px-4 py-3 text-sm text-gray-400">
                  {endReasonBySessionId[session.id] || '—'}
                </td>
              )}
              <td className="px-4 py-3 text-sm min-w-[140px]">
                <HubProgressLabel rawData={session.raw_data} />
                <HubProgressBar rawData={session.raw_data} />
              </td>
              <td className="px-4 py-3 text-center text-sm text-amber-300 font-medium">
                {session.score ?? 0}
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-300">
                {session.accuracy_percent ?? 0}%
              </td>
              <td className="px-4 py-3 text-sm">
                <HubMiniGameList rawData={session.raw_data} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
