// Standalone, non-functional visual mockup of the redesigned Teacher Room.
// This file does NOT touch the real app: no Supabase, no routes/APIs, no
// activity logic. It only renders static placeholder data to preview the
// "Quiet Classroom" visual direction. Safe to delete at any time.

import type { ReactNode } from "react"

export const metadata = {
  title: "Teacher Room — Quiet Classroom Mockup",
}

/* ---------------------------------------------------------------- */
/* Inline line icons (no external dependency)                        */
/* ---------------------------------------------------------------- */

type IconProps = { className?: string }

function MonitorIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

function BarChartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="1" />
      <rect x="12" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="13" width="3" height="4" rx="1" />
    </svg>
  )
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CloudIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 6.5 19z" />
    </svg>
  )
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ScanIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" />
    </svg>
  )
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  )
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* Placeholder data                                                  */
/* ---------------------------------------------------------------- */

const ROOM_CODE = "4413"
const STUDENTS_CONNECTED = 18
const RESPONSE_COUNT = 18
const LIVE_QUESTION = "What is the biggest environmental challenge in Cambodia?"

type Activity = {
  id: string
  title: string
  description: string
  icon: (props: IconProps) => ReactNode
  active?: boolean
}

const ACTIVITIES: Activity[] = [
  { id: "poll", title: "Poll", description: "Single-choice live voting with instant results.", icon: BarChartIcon },
  { id: "discussion", title: "Discussion", description: "Open responses students can react to.", icon: ChatIcon },
  { id: "wordcloud", title: "Word Cloud", description: "Collect short answers into a live cloud.", icon: CloudIcon, active: true },
  { id: "bias", title: "Bias Detective", description: "Spot bias in sources and headlines.", icon: SearchIcon },
]

const LIVE_RESPONSES = [
  "Plastic pollution",
  "Deforestation",
  "Air quality in Phnom Penh",
  "Mekong river health",
  "Waste management",
]

/* ---------------------------------------------------------------- */
/* Faux QR (purely decorative, deterministic pattern)                */
/* ---------------------------------------------------------------- */

function FauxQr({ className }: IconProps) {
  const cells = 11
  // Deterministic pseudo-random pattern so it looks like a real QR.
  const filled = (r: number, c: number) => ((r * 7 + c * 13 + r * c * 3) % 5) < 2
  const finder = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c > cells - 4) || (r > cells - 4 && c < 3)
  return (
    <svg className={className} viewBox={`0 0 ${cells} ${cells}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={cells} height={cells} fill="white" />
      {Array.from({ length: cells }).map((_, r) =>
        Array.from({ length: cells }).map((_, c) =>
          !finder(r, c) && filled(r, c) ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />
          ) : null,
        ),
      )}
      {/* finder squares */}
      {[
        [0, 0],
        [0, cells - 3],
        [cells - 3, 0],
      ].map(([y, x], i) => (
        <g key={i}>
          <rect x={x} y={y} width={3} height={3} fill="#0f172a" />
          <rect x={x + 1} y={y + 1} width={1} height={1} fill="white" />
        </g>
      ))}
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function TeacherRoomMockupPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        {/* Mockup notice */}
        <div className="mb-8 flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200">
          <span className="font-medium">Preview only</span>
          <span className="text-indigo-300/70">
            Non-functional visual mockup of the redesigned Teacher Room. No data is connected.
          </span>
        </div>

        {/* Header / room identity */}
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Room code</span>
              <div className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 font-mono text-3xl font-semibold tracking-[0.3em] text-white shadow-sm">
                {ROOM_CODE}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-medium text-slate-200">Live</span>
              <span className="text-slate-500">·</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <UsersIcon className="h-4 w-4" />
                {STUDENTS_CONNECTED} students
              </span>
            </div>
          </div>

          {/* Header actions: one primary, two quiet */}
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              <MonitorIcon className="h-4 w-4" />
              Open Presentation
            </button>
            <button className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
              Remove all
            </button>
            <button className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
              Close room
            </button>
          </div>
        </header>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Launch activity grid */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">Launch an activity</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ACTIVITIES.map((activity) => {
                  const Icon = activity.icon
                  return (
                    <div
                      key={activity.id}
                      className={[
                        "group relative flex flex-col gap-3 rounded-xl border bg-slate-900 p-5 transition-colors",
                        activity.active
                          ? "border-indigo-500 ring-1 ring-indigo-500/40"
                          : "border-slate-800 hover:border-slate-700",
                      ].join(" ")}
                    >
                      {activity.active && (
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Active
                        </span>
                      )}
                      <span
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                          activity.active ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-300",
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-white">{activity.title}</h3>
                        <p className="text-sm leading-relaxed text-slate-400">{activity.description}</p>
                      </div>
                      <button
                        className={[
                          "mt-2 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          activity.active
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "border border-slate-700 text-slate-200 hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {activity.active ? "Relaunch" : "Launch"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Live Now panel */}
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <CloudIcon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">Word Cloud</span>
                    <span className="text-xs text-slate-400">Live now</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Collecting
                </span>
              </div>

              <p className="mb-6 text-balance text-xl font-semibold leading-snug text-white">
                {LIVE_QUESTION}
              </p>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-white">{RESPONSE_COUNT}</span>
                  <span className="text-sm text-slate-400">responses</span>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500">
                  <CheckIcon className="h-4 w-4" />
                  Reveal results
                </button>
              </div>

              {/* response preview chips */}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-5">
                {LIVE_RESPONSES.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300"
                  >
                    {r}
                  </span>
                ))}
                <span className="rounded-full px-3 py-1.5 text-sm text-slate-500">+13 more</span>
              </div>
            </section>
          </div>

          {/* Right column — sticky QR */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  <ScanIcon className="h-5 w-5" />
                  <h2 className="text-base font-semibold text-slate-900">Scan to join</h2>
                </div>
                <div className="flex justify-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <FauxQr className="h-44 w-44" />
                  </div>
                </div>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Room code</span>
                  <div className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2 font-mono text-2xl font-semibold tracking-[0.3em] text-indigo-700">
                    {ROOM_CODE}
                  </div>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                  <span className="text-xs text-slate-400">Or visit</span>
                  <p className="font-mono text-sm text-slate-600">classroom.app/join</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
