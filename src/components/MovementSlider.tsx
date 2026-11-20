import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Block } from '../data/blockModels'
import type { ViewerMode } from '../viewer/Viewer'

interface MovementSliderProps {
  mode: ViewerMode
  getMovementBlocks: () => readonly Block[] | null
  movementCount: number
  disabled: boolean
  onChange: (progress: number) => void
  children: ReactNode
}

export default function MovementSlider({ mode, getMovementBlocks, movementCount, disabled, onChange, children }: MovementSliderProps) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const progressRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  const changeProgress = (value: number): void => {
    progressRef.current = value
    setProgress(value)
    onChange(value)
  }

  const pause = useCallback((): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setPlaying(false)
  }, [])

  useEffect(pause, [pause, getMovementBlocks, movementCount, mode])

  useEffect(() => {
    progressRef.current = 0
    setProgress(0)
  }, [mode])

  const togglePlayback = (): void => {
    if (frameRef.current !== null) return pause()
    if (progressRef.current === 1) changeProgress(0)
    const from = progressRef.current
    const startedAt = performance.now()
    setPlaying(true)
    const animate = (time: number): void => {
      const value = Math.min(1, from + (time - startedAt) / 2800)
      changeProgress(value)
      if (value < 1) frameRef.current = requestAnimationFrame(animate)
      else {
        frameRef.current = null
        setPlaying(false)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
  }

  const playbackLabel = playing ? 'Pause' : progress === 1 ? 'Replay' : 'Play'

  return (
    <section aria-label="Predicted material movement" className="pointer-events-auto flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs text-neutral-300 shadow-lg lg:flex-1">
      <div className="flex items-center gap-3">
        <button type="button" aria-label={playbackLabel} title={playbackLabel} disabled={disabled} onClick={togglePlayback} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-sm border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8">
            {playing ? (
              <path fill="currentColor" d="M6 4h4v16H6zm8 0h4v16h-4z" />
            ) : progress === 1 ? (
              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 1 2.6 6.4M3 6v6h6" />
            ) : (
              <path fill="currentColor" d="M7 4v16l13-8z" />
            )}
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <input
            id="movement-progress"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={progress}
            disabled={disabled}
            aria-label="Animation progress"
            aria-valuetext={progress === 0 ? 'Pre-blast' : progress === 1 ? 'Predicted post-blast' : Math.round(progress * 100) + '% of animation'}
            onChange={(event) => {
              pause()
              changeProgress(event.currentTarget.valueAsNumber)
            }}
            style={{ '--playback-progress': `${progress * 100}%` } as CSSProperties}
            className="playback-scrubber block h-6 w-full cursor-pointer appearance-none rounded-sm bg-transparent text-neutral-100 enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40"
          />
          <div className="mt-2 flex justify-between gap-2 text-neutral-400">
            <span>Pre-blast</span>
            <span className="text-right">Predicted post-blast</span>
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}
