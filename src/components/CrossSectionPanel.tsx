import CrossSectionCanvas from "./CrossSectionCanvas";
import type { ReactNode } from "react";
import type { ColourScale } from "../data/blockColours";
import type { Block } from "../data/blockModels";

interface CrossSectionPanelProps {
  blocks: readonly Block[];
  scale: ColourScale;
  filtered: boolean;
  onExit: () => void;
  onInspect?: () => void;
  children: ReactNode;
}

export default function CrossSectionPanel({
  blocks,
  scale,
  filtered,
  onExit,
  onInspect,
  children,
}: CrossSectionPanelProps) {
  return (
    <section
      id="cross-section-panel"
      aria-label="Cross-section"
      className="space-y-3 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-100">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-neutral-400">
            <path d="m3 12 5-1 5-5 8 3v4H3Zm0 3h18v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" />
          </svg>
          Cross-section
        </h2>
        <button type="button" aria-label="Exit slice" title="Exit slice" onClick={onExit} className="grid size-8 cursor-pointer place-items-center rounded-sm text-neutral-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="relative overflow-hidden rounded-sm border border-white/5 bg-neutral-950/60">
        <CrossSectionCanvas blocks={blocks} scale={scale} />
        {!blocks.length && (
          <p className="absolute inset-0 grid place-items-center text-neutral-500">
            {filtered ? "No matching blocks in this section." : "No blocks at this section."}
          </p>
        )}
      </div>
      {children}
      <button type="button" disabled={!onInspect} onClick={onInspect} className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-neutral-600 bg-neutral-700 font-medium text-white enabled:hover:bg-neutral-600 focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">
        Inspect section
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </button>
    </section>
  );
}
