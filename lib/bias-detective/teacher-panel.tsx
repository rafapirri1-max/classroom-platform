'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildBiasDetectiveAIPrompt } from './ai-prompt'
import { DEFAULT_BIAS_SET_TITLE, getBuiltinDefaultContent } from './default-set'
import { BIAS_DETECTIVE_ACTIVITY_ID, type BiasQuestionSetSummary } from './types'
import { validateBiasDetectiveSet, validateQuestionSetTitle } from './validate-set'

type BiasDetectiveTeacherPanelProps = {
  roomId: string
  teacherId: string | null
  isActive: boolean
  onLaunched: () => Promise<void>
}

type SelectedSetId = 'default' | string

export function BiasDetectiveTeacherPanel({
  roomId,
  teacherId,
  isActive,
  onLaunched,
}: BiasDetectiveTeacherPanelProps) {
  const [savedSets, setSavedSets] = useState<BiasQuestionSetSummary[]>([])
  const [selectedSetId, setSelectedSetId] = useState<SelectedSetId>('default')
  const [loadingSets, setLoadingSets] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadSets = useCallback(async () => {
    if (!teacherId) return
    setLoadingSets(true)
    try {
      const res = await fetch(
        `/api/bias-detective/question-sets?teacher_id=${encodeURIComponent(teacherId)}`
      )
      const json = await res.json()
      if (res.ok && Array.isArray(json.sets)) {
        setSavedSets(json.sets)
      }
    } catch {
      // ignore list errors; dropdown still has default
    } finally {
      setLoadingSets(false)
    }
  }, [teacherId])

  useEffect(() => {
    void loadSets()
  }, [loadSets])

  async function launchWithSelectedSet() {
    if (!teacherId) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setLaunching(true)
    setStatusMessage('')
    try {
      const res = await fetch('/api/bias-detective/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          question_set_id: selectedSetId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to launch Bias Detective')
      }
      await onLaunched()
      setStatusMessage('Launched with selected question set.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch'
      alert(message)
    } finally {
      setLaunching(false)
    }
  }

  async function handleUploadFile(file: File) {
    if (!teacherId) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setUploading(true)
    setStatusMessage('')
    try {
      const text = await file.text()
      const validated = validateBiasDetectiveSet(text)
      if (!validated.ok) {
        throw new Error(validated.error)
      }

      const defaultTitle = file.name.replace(/\.json$/i, '').trim() || 'Imported question set'
      const titleInput = window.prompt('Name this question set:', defaultTitle)
      if (titleInput === null) return

      const titleValidated = validateQuestionSetTitle(titleInput)
      if (!titleValidated.ok) {
        throw new Error(titleValidated.error)
      }

      const res = await fetch('/api/bias-detective/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          title: titleValidated.title,
          content: validated.content,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to save question set')
      }

      await loadSets()
      if (json.set?.id) {
        setSelectedSetId(json.set.id)
      }
      setStatusMessage(`Saved "${titleValidated.title}" (${validated.questionCount} questions).`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      alert(message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function exportSelectedSet() {
    setStatusMessage('')
    try {
      if (selectedSetId === 'default') {
        const content = getBuiltinDefaultContent()
        downloadJson(content, 'bias-detective-default-set.json')
        setStatusMessage('Exported built-in default set.')
        return
      }

      if (!teacherId) {
        alert('Teacher profile not loaded. Please refresh and try again.')
        return
      }

      const res = await fetch(
        `/api/bias-detective/question-sets/${encodeURIComponent(selectedSetId)}?teacher_id=${encodeURIComponent(teacherId)}`
      )
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to export question set')
      }
      const filename = `${slugify(json.title || 'bias-question-set')}.json`
      downloadJson(json.content, filename)
      setStatusMessage(`Exported "${json.title}".`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed'
      alert(message)
    }
  }

  async function copyAIPrompt() {
    setStatusMessage('')
    try {
      let exampleContent = getBuiltinDefaultContent()
      let exampleTitle = DEFAULT_BIAS_SET_TITLE

      if (selectedSetId !== 'default' && teacherId) {
        const res = await fetch(
          `/api/bias-detective/question-sets/${encodeURIComponent(selectedSetId)}?teacher_id=${encodeURIComponent(teacherId)}`
        )
        const json = await res.json()
        if (res.ok && json.content) {
          exampleContent = json.content
          exampleTitle = json.title || exampleTitle
        }
      }

      const prompt = buildBiasDetectiveAIPrompt({
        exampleContent,
        exampleSetTitle: exampleTitle,
      })

      await navigator.clipboard.writeText(prompt)
      setStatusMessage('AI prompt copied to clipboard.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to copy prompt'
      alert(message)
    }
  }

  const selectedLabel =
    selectedSetId === 'default'
      ? DEFAULT_BIAS_SET_TITLE
      : savedSets.find((s) => s.id === selectedSetId)?.title ?? 'Saved set'

  return (
    <div
      className={`p-5 rounded-2xl border-2 text-left transition-all ${
        isActive
          ? 'bg-primary/30 border-primary text-white'
          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
      }`}
    >
      <div className="text-3xl mb-2">🧠</div>
      <div className="font-bold">Bias Detective</div>
      <div className="text-xs text-indigo-200 mt-1">
        Spot cognitive biases in real-world scenarios
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-xs text-indigo-200">
          Question set
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value as SelectedSetId)}
            disabled={loadingSets || !teacherId}
            className="mt-1 w-full rounded-lg bg-slate-900/60 border border-white/20 px-3 py-2 text-sm text-white"
          >
            <option value="default">{DEFAULT_BIAS_SET_TITLE}</option>
            {savedSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.title} ({set.question_count} questions)
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void launchWithSelectedSet()}
            disabled={launching || !teacherId}
            className="px-3 py-2 rounded-lg bg-primary/80 hover:bg-primary text-white text-xs font-semibold disabled:opacity-50"
          >
            {launching ? 'Launching…' : 'Launch with selected set'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !teacherId}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload JSON set'}
          </button>

          <button
            type="button"
            onClick={() => void copyAIPrompt()}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
          >
            Copy AI prompt
          </button>

          <button
            type="button"
            onClick={() => void exportSelectedSet()}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
          >
            Export selected set
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUploadFile(file)
          }}
        />

        <p className="text-[11px] text-indigo-300/80">
          Selected: {selectedLabel}. Saved sets persist across rooms and school years.
        </p>

        {statusMessage && (
          <p className="text-xs text-green-300/90">{statusMessage}</p>
        )}

        {isActive && (
          <div className="text-xs mt-1 text-primary-300">✓ Currently Active</div>
        )}
      </div>
    </div>
  )
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || BIAS_DETECTIVE_ACTIVITY_ID
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
