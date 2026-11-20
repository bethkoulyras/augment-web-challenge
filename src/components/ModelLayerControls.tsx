interface ModelLayerControlsProps {
  showSurfaces: boolean
  surfacesLoading: boolean
  surfaceLoadFailed: boolean
  onToggleSurfaces: () => void
  showBlastHoles: boolean
  blastHolesLoading: boolean
  hasBlastHoles: boolean
  onToggleBlastHoles: () => void
}

const layerDot = 'size-2 shrink-0 rounded-full opacity-40 group-aria-pressed:opacity-100'
const layerWarning = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-neutral-400">
    <path d="M12 4 22 21H2Zm0 6v4m0 3h.01" />
  </svg>
)

export default function ModelLayerControls({
  showSurfaces, surfacesLoading, surfaceLoadFailed, onToggleSurfaces,
  showBlastHoles, blastHolesLoading, hasBlastHoles, onToggleBlastHoles,
}: ModelLayerControlsProps) {
  const blastHolesUnavailable = !blastHolesLoading && !hasBlastHoles

  return (
    <div role="group" aria-label="Model layers" className="flex flex-wrap items-center justify-end gap-4">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-neutral-400">
        <span aria-hidden="true" className="w-3 border-t border-neutral-500" />
        Blast boundary
      </span>
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          aria-label="Surfaces"
          aria-describedby={surfaceLoadFailed ? 'surfaces-hint' : undefined}
          aria-pressed={showSurfaces}
          aria-busy={surfacesLoading || undefined}
          title={surfacesLoading ? 'Loading survey surfaces…' : undefined}
          onClick={onToggleSurfaces}
          className="group relative outlined-button"
        >
          <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center">
            {surfaceLoadFailed ? layerWarning : (
              <span className={surfacesLoading ? 'size-3 rounded-full border border-neutral-500 border-t-neutral-100 motion-safe:animate-spin' : layerDot + ' bg-[#8aa0b2]'} />
            )}
          </span>
          Surfaces
          {surfaceLoadFailed && (
            <span id="surfaces-hint" role="tooltip" className="layer-tooltip left-0">Couldn’t load surfaces. Select to retry.</span>
          )}
        </button>
        <button
          type="button"
          aria-label="Blast holes"
          aria-describedby={blastHolesUnavailable ? 'blast-holes-hint' : undefined}
          aria-pressed={showBlastHoles}
          aria-busy={blastHolesLoading || undefined}
          aria-disabled={!hasBlastHoles || undefined}
          onClick={hasBlastHoles ? onToggleBlastHoles : undefined}
          className="group relative outlined-button aria-disabled:cursor-default aria-disabled:border-neutral-800 aria-disabled:text-neutral-500"
        >
          <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center">
            {blastHolesUnavailable ? layerWarning : <span className={layerDot + ' bg-amber-400'} />}
          </span>
          Blast holes
          {blastHolesUnavailable && (
            <span id="blast-holes-hint" role="tooltip" className="layer-tooltip right-0">Blast hole data unavailable.</span>
          )}
        </button>
      </div>
    </div>
  )
}
