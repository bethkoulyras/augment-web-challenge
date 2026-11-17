import CrossSectionCanvas from "./CrossSectionCanvas";
import type { ColourScale } from "../data/blockColours";
import type { Block } from "../data/blockModels";

interface CrossSectionPanelProps {
  blocks: readonly Block[];
  scale: ColourScale;
  onInspect?: () => void;
}

export default function CrossSectionPanel({
  blocks,
  scale,
  onInspect,
}: CrossSectionPanelProps) {
  return (
    <section
      aria-label="Cross-section"
      className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-xs text-neutral-300 shadow-2xl backdrop-blur-md"
    >
      <h2 className="text-sm font-medium text-neutral-100">Cross-section</h2>
      <div className="relative overflow-hidden rounded-lg border border-white/5 bg-neutral-950/60">
        <CrossSectionCanvas blocks={blocks} scale={scale} />
        {!blocks.length && (
          <p className="absolute inset-0 grid place-items-center text-neutral-500">
            No blocks at this section.
          </p>
        )}
      </div>
      {onInspect && (
        <button type="button" disabled={!blocks.length} onClick={onInspect} className="w-full cursor-pointer rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-neutral-100 hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">
          Inspect section
        </button>
      )}
    </section>
  );
}
