import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import BlockInspector from './BlockInspector'
import CrossSectionPanel from './CrossSectionPanel'
import SectionSummary from './SectionSummary'
import type { ColourScale } from '../data/blockColours'
import type { Block } from '../data/blockModels'
import type { ViewerMode } from '../viewer/Viewer'

interface SliceSidebarProps {
  scale: ColourScale
  filtered: boolean
  mode: ViewerMode
  open: boolean
  focusRequest: number
  blocks: readonly Block[]
  totalCount: number
  northingSlider: ReactNode
  selectedBlock: Block | null
  showConnections: boolean
  onModeChange: (mode: ViewerMode) => void
  onClearBlock: () => void
  onToggleConnections: () => void
  children: ReactNode
}

const sliceIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
    <path d="M12 2.5 21 7.5v9l-9 5-9-5v-9Z" fillOpacity=".35" />
    <path d="m12 2.5 9 5-9 5-9-5Z" fillOpacity=".3" />
    <path d="m6 5.8 3-1.6 9 5v9l-3 1.6v-9Z" />
  </svg>
)

export default function SliceSidebar({
  scale, filtered, mode, open, focusRequest, blocks, totalCount, northingSlider,
  selectedBlock, showConnections, onModeChange, onClearBlock, onToggleConnections, children,
}: SliceSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarResultRef = useRef<HTMLDivElement>(null)
  const handledFocusRequest = useRef(focusRequest)

  useLayoutEffect(() => {
    if (!open) return
    const focusRequested = handledFocusRequest.current !== focusRequest
    if ((mode !== 'model' || focusRequested) && sidebarRef.current) sidebarRef.current.scrollTop = 0
    if (focusRequested) {
      sidebarResultRef.current?.focus({ preventScroll: true })
      handledFocusRequest.current = focusRequest
    }
  }, [mode, selectedBlock, open, focusRequest])

  useLayoutEffect(() => {
    const result = sidebarResultRef.current
    const frame = result?.parentElement
    if (!result || !frame) return
    const resizeResult = () => { frame.style.height = `${result.getBoundingClientRect().height}px` }
    resizeResult()
    const observer = new ResizeObserver(resizeResult)
    observer.observe(result)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return

    const updateScrollFade = () => {
      sidebar.toggleAttribute('data-scrollable-below', sidebar.scrollHeight - sidebar.clientHeight - sidebar.scrollTop > 1)
    }
    const observer = new ResizeObserver(updateScrollFade)
    observer.observe(sidebar)
    for (const child of sidebar.children) observer.observe(child)
    sidebar.addEventListener('scroll', updateScrollFade, { passive: true })
    updateScrollFade()

    return () => {
      observer.disconnect()
      sidebar.removeEventListener('scroll', updateScrollFade)
    }
  }, [])

  return (
    <aside
      id="viewer-sidebar"
      aria-label="Viewer sidebar"
      inert={!open}
      className={'z-10 col-span-full row-start-2 flex max-h-full w-full flex-col self-start overflow-hidden rounded-md border border-neutral-700 bg-neutral-900/95 text-xs text-neutral-300 shadow-lg transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none sm:absolute sm:top-[var(--viewer-inset)] sm:left-[var(--viewer-inset)] sm:h-[calc(100%_-_2_*_var(--viewer-inset))] sm:w-[var(--viewer-sidebar-width)] sm:pt-10 ' + (open ? '' : 'invisible opacity-0')}
    >
      <div ref={sidebarRef} className="sidebar-scroll min-h-0 overflow-y-auto sm:border-t sm:border-white/10">
        <div className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none">
          <div id="section-workflow" ref={sidebarResultRef} tabIndex={-1} className="focus:outline-none">
            <div key={selectedBlock ? 'block' : mode} className="px-2 pt-3 pb-4 motion-safe:animate-[sidebar-result-in_180ms_ease-out]">
              <div className="rounded-sm bg-neutral-950/60 inset-ring inset-ring-white/10">
                {mode === 'model' ? (
                  <button
                    type="button"
                    aria-label="Slice model"
                    aria-describedby="slice-model-hint"
                    aria-controls="section-workflow"
                    onClick={() => onModeChange('slice')}
                    className="group flex w-full cursor-pointer flex-col items-start gap-2 rounded-sm p-4 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-300 motion-safe:transition-colors"
                  >
                    <span className="flex w-full items-center gap-2 text-sm font-medium text-neutral-100">
                      {sliceIcon}
                      Slice model
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 text-neutral-400 group-hover:text-white">
                        <path d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </span>
                    <span id="slice-model-hint" className="text-neutral-400">View a cross-section through the block model.</span>
                  </button>
                ) : mode === 'slice' ? (
                  <CrossSectionPanel
                    blocks={blocks}
                    scale={scale}
                    filtered={filtered}
                    onExit={() => onModeChange('model')}
                    onInspect={blocks.length > 0 ? () => onModeChange('inspect') : undefined}
                  >
                    {northingSlider}
                  </CrossSectionPanel>
                ) : (
                  <>
                    <div className="px-3 pt-4">
                      <button
                        type="button"
                        onClick={selectedBlock ? onClearBlock : () => onModeChange('slice')}
                        className="outlined-button text-neutral-100"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                          <path d="M19 12H5m6-6-6 6 6 6" />
                        </svg>
                        {selectedBlock ? 'Back to section' : 'Back to slice'}
                      </button>
                    </div>
                    {selectedBlock ? (
                      <BlockInspector block={selectedBlock} field={scale.field} />
                    ) : (
                      <>
                        <SectionSummary blocks={blocks} totalCount={totalCount} />
                        <div className="space-y-2 border-t border-white/10 px-3 pt-3 pb-4">
                          {northingSlider}
                          <button
                            type="button"
                            aria-label="Movement connections"
                            aria-pressed={showConnections}
                            onClick={onToggleConnections}
                            className="outlined-button"
                          >
                            <span aria-hidden="true" className="w-3 border-t border-dashed border-neutral-400" />
                            Connections
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </aside>
  )
}
