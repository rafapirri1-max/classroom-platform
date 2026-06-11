import type { ReactNode } from 'react'

type PresentShellProps = {
  roomCode: string
  roomStatus: string
  live?: boolean
  mainClassName?: string
  shellClassName?: string
  hideHeader?: boolean
  children: ReactNode
}

export function PresentShell({
  roomCode,
  roomStatus,
  live = false,
  mainClassName,
  shellClassName,
  hideHeader = false,
  children,
}: PresentShellProps) {
  return (
    <div
      className={
        shellClassName ??
        'min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 flex flex-col'
      }
    >
      {!hideHeader && (
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div className="text-sm uppercase tracking-[0.2em] text-indigo-300/80">Presentation</div>
          <div className="flex items-center gap-4">
            {live && (
              <span className="flex items-center gap-2 text-green-300 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                roomStatus === 'active'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {roomStatus}
            </span>
            <span className="text-3xl font-bold tracking-[0.25em] text-white">{roomCode}</span>
          </div>
        </header>
      )}
      <main className={mainClassName ?? 'flex-1 flex items-center justify-center p-8'}>
        {children}
      </main>
    </div>
  )
}
