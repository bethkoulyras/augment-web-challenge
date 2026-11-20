import CrossSectionCanvas from "./CrossSectionCanvas";
import type { ColourScale } from "../data/blockColours";
import type { Block } from "../data/blockModels";

interface CrossSectionPanelProps {
  blocks: readonly Block[];
  scale: ColourScale;
  filtered: boolean;
}

export default function CrossSectionPanel({
  blocks,
  scale,
  filtered,
}: CrossSectionPanelProps) {
  return (
    <section
      id="cross-section-panel"
      aria-label="Cross-section"
      className="space-y-3 p-3"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-100">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-neutral-400">
          <path d="m3 12 5-1 5-5 8 3v4H3Zm0 3h18v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" />
        </svg>
        Cross-section
      </h2>
      <div className="relative overflow-hidden rounded-lg border border-white/5 bg-neutral-950/60">
        <CrossSectionCanvas blocks={blocks} scale={scale} />
        {!blocks.length && (
          <p className="absolute inset-0 grid place-items-center text-neutral-500">
            {filtered ? "No matching blocks in this section." : "No blocks at this section."}
          </p>
        )}
      </div>
    </section>
  );
}
