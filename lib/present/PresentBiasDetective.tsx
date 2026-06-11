import type { PresentInstanceMeta } from './types'

type PresentBiasDetectiveProps = {
  roomCode: string
  instance: PresentInstanceMeta | null
}

export function PresentBiasDetective({ roomCode, instance }: PresentBiasDetectiveProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 max-w-4xl mx-auto">
      <div className="text-[6rem] leading-none mb-6">🕵️</div>
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Bias Detective</h1>
      <p className="text-2xl md:text-3xl text-indigo-100 mb-10 leading-relaxed">
        Complete the activities on your device.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xl">
        <span className="px-5 py-2 rounded-full bg-green-500/20 text-green-300 border border-green-500/40 font-semibold">
          ● Live
        </span>
        <span className="text-3xl font-bold tracking-[0.25em] text-accent">{roomCode}</span>
      </div>
      {instance?.started_at && (
        <p className="text-lg text-indigo-400 mt-8">
          Started {new Date(instance.started_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
