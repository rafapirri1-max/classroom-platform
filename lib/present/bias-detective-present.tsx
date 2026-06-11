import { RoomQrCode } from './room-qr-code'

type BiasDetectivePresentProps = {
  roomId: string
  roomCode: string
  startedAt?: string | null
}

export function BiasDetectivePresent({ roomId, roomCode, startedAt }: BiasDetectivePresentProps) {
  return (
    <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
      <div className="text-center lg:text-left flex-1">
        <div className="text-8xl mb-6">🕵️</div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Bias Detective</h1>
        <p className="text-2xl md:text-3xl text-indigo-100 mb-8 leading-relaxed">
          Complete the activities on your device.
        </p>
        <div className="inline-flex flex-col gap-3 items-center lg:items-start px-8 py-6 rounded-2xl bg-white/10 border border-white/15">
          <p className="text-indigo-300 text-lg">Room code</p>
          <p className="text-5xl font-bold tracking-[0.3em] text-white">{roomCode}</p>
          {startedAt && (
            <p className="text-indigo-300 text-sm mt-2">
              Started {new Date(startedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 lg:self-end">
        <RoomQrCode roomId={roomId} roomCode={roomCode} variant="compact" />
      </div>
    </div>
  )
}
