import { useEffect, useRef, useState } from 'react'

interface MovementSliderProps {
  disabled: boolean
  onChange: (progress: number) => void
  showConnections: boolean
  onConnectionsChange?: (show: boolean) => void
}

export default function MovementSlider({ disabled, onChange, showConnections, onConnectionsChange }: MovementSliderProps) {
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

  const pause = (): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setPlaying(false)
  }

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

  return (
    <section aria-label="Section movement" className="absolute right-6 bottom-6 left-6 z-10 mx-auto max-w-2xl rounded-xl border border-neutral-700 bg-neutral-900/95 px-4 py-3 text-xs text-neutral-300 shadow-lg sm:left-92">
      <div className="flex items-center gap-3">
        <button type="button" disabled={disabled} onClick={togglePlayback} className="min-w-20 cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 font-medium text-neutral-100 hover:bg-neutral-600 focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">
          {playing ? 'Pause' : progress === 1 ? 'Replay' : 'Play'}
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
            aria-valuetext={Math.round(progress * 100) + '%'}
            onChange={(event) => {
              pause()
              changeProgress(event.currentTarget.valueAsNumber)
            }}
            className="block w-full cursor-pointer accent-neutral-300"
          />
          <div className="mt-2 flex justify-between text-neutral-400">
            <span>Pre-blast</span>
            <span>OMP prediction</span>
          </div>
        </div>
      </div>
      {onConnectionsChange && (
        <label className="mt-3 ml-auto flex w-fit cursor-pointer items-center gap-2 text-neutral-400">
          <input type="checkbox" checked={showConnections} onChange={(event) => onConnectionsChange(event.currentTarget.checked)} className="cursor-pointer accent-neutral-300" />
          Movement connections
        </label>
      )}
    </section>
  )
}
