export function PresentWaiting({ roomCode }: { roomCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8">
      <div className="text-[8rem] leading-none mb-8 animate-pulse">⏳</div>
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Waiting for teacher</h1>
      <p className="text-2xl md:text-3xl text-indigo-200 mb-10">
        The next activity will appear here.
      </p>
      <p className="text-3xl font-bold tracking-[0.3em] text-accent">{roomCode}</p>
    </div>
  )
}
