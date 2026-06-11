import { RoomQrCode } from './room-qr-code'

type WaitingPresentProps = {
  roomId: string
  roomCode: string
}

export function WaitingPresent({ roomId, roomCode }: WaitingPresentProps) {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 w-full max-w-5xl">
      <div className="text-center lg:text-left flex-1">
        <div className="text-8xl mb-8 animate-pulse">⏳</div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Waiting for teacher</h1>
        <p className="text-2xl text-indigo-200">The next activity will appear here.</p>
      </div>
      <div className="shrink-0">
        <RoomQrCode roomId={roomId} roomCode={roomCode} variant="prominent" />
      </div>
    </div>
  )
}
