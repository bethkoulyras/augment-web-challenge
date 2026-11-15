import { useEffect, useMemo, useRef } from "react";
import { drawCrossSection } from "../viewer/drawCrossSection";
import type { ColourScale } from "../data/blockColours";
import type { BlockModels, ModelView } from "../data/blockModels";

interface CrossSectionPanelProps {
  models: BlockModels;
  view: ModelView;
  y: number;
  scale: ColourScale;
}

export default function CrossSectionPanel({
  models,
  view,
  y,
  scale,
}: CrossSectionPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blocks = useMemo(
    () =>
      models[view]
        .filter((block) => Math.abs(block.y - y) <= block.depth / 2 + 0.001)
        .sort((a, b) => a.y - b.y),
    [models, view, y],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = (): void => drawCrossSection(canvas, blocks, scale);

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [blocks, scale]);

  return (
    <section
      aria-label="Cross-section"
      className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-xs text-neutral-300 shadow-2xl backdrop-blur-md"
    >
      <h2 className="text-sm font-medium text-neutral-100">Cross-section</h2>
      <div className="relative overflow-hidden rounded-lg border border-white/5 bg-neutral-950/60">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={"Cross-section coloured by " + scale.field}
          className="h-44 w-full"
        />
        {!blocks.length && (
          <p className="absolute inset-0 grid place-items-center text-neutral-500">
            No blocks at this section.
          </p>
        )}
      </div>
    </section>
  );
}
