'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export type RoomQrCodeVariant = 'prominent' | 'compact' | 'minimal' | 'micro'

type RoomQrCodeProps = {
  roomId: string
  roomCode: string
  variant?: RoomQrCodeVariant
}

const QR_PIXEL_WIDTH: Record<RoomQrCodeVariant, number> = {
  prominent: 280,
  compact: 200,
  minimal: 112,
  micro: 72,
}

const QR_BOX_CLASS: Record<RoomQrCodeVariant, string> = {
  prominent: 'w-[280px] h-[280px]',
  compact: 'w-[200px] h-[200px]',
  minimal: 'w-[112px] h-[112px]',
  micro: 'w-[72px] h-[72px]',
}

export function RoomQrCode({ roomId, roomCode, variant = 'prominent' }: RoomQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const pixelWidth = QR_PIXEL_WIDTH[variant]

  useEffect(() => {
    if (typeof window === 'undefined') return

    const joinUrl = `${window.location.origin}/student/${roomId}`
    let cancelled = false

    void QRCode.toDataURL(joinUrl, { width: pixelWidth, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [roomId, pixelWidth])

  if (variant === 'micro') {
    return (
      <div
        className={`${QR_BOX_CLASS.micro} rounded-md bg-white/95 p-1 flex items-center justify-center shadow-sm shrink-0 opacity-80`}
        title={`Scan to join room ${roomCode}`}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code to join room ${roomCode}`}
            width={pixelWidth}
            height={pixelWidth}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full rounded bg-gray-100 animate-pulse" aria-hidden />
        )}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3 text-right">
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[10px] font-medium text-indigo-300/80 uppercase tracking-widest">
            Scan to join
          </p>
          <p className="text-lg font-bold tracking-[0.2em] text-white/90">{roomCode}</p>
        </div>
        <div
          className={`${QR_BOX_CLASS.minimal} rounded-lg bg-white p-1.5 flex items-center justify-center shadow-md shrink-0`}
        >
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code to join room ${roomCode}`}
              width={pixelWidth}
              height={pixelWidth}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full rounded bg-gray-100 animate-pulse" aria-hidden />
          )}
        </div>
      </div>
    )
  }

  const isProminent = variant === 'prominent'

  return (
    <div
      className={`flex flex-col items-center text-center ${
        isProminent ? 'gap-4' : 'gap-3'
      }`}
    >
      <p
        className={`font-medium text-indigo-200 uppercase tracking-widest ${
          isProminent ? 'text-sm' : 'text-xs'
        }`}
      >
        Scan to join
      </p>
      <div
        className={`${QR_BOX_CLASS[variant]} rounded-2xl bg-white p-3 flex items-center justify-center shadow-lg`}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code to join room ${roomCode}`}
            width={pixelWidth}
            height={pixelWidth}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" aria-hidden />
        )}
      </div>
      <p
        className={`font-bold tracking-[0.25em] text-white ${
          isProminent ? 'text-4xl' : 'text-2xl'
        }`}
      >
        {roomCode}
      </p>
    </div>
  )
}
