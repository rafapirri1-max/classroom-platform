export function PresentClosed({ roomCode }: { roomCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8">
      <div className="text-[6rem] leading-none mb-8">🚪</div>
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Room closed</h1>
      <p className="text-2xl text-indigo-200 mb-10">This session has ended.</p>
      <p className="text-2xl text-gray-400 tracking-widest">{roomCode}</p>
    </div>
  )
}
