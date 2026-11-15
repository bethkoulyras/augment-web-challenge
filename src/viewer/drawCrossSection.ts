import { colourCss, colourForValue } from "../data/blockColours";
import type { ColourScale } from "../data/blockColours";
import type { Block } from "../data/blockModels";

interface SectionBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function drawCrossSection(
  canvas: HTMLCanvasElement,
  blocks: readonly Block[],
  scale: ColourScale,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const padding = 8;
  if (!blocks.length || width <= padding * 2 || height <= padding * 2) return;

  const bounds = getSectionBounds(blocks);
  const { pixelsPerUnit, centreX, canvasBottom } =
    fitSectionToCanvas(bounds, width, height, padding);

  context.strokeStyle = "rgba(0, 0, 0, 0.3)";
  context.lineWidth = 0.5;

  for (const block of blocks) {
    const screenX =
      width / 2 + (block.x - block.width / 2 - centreX) * pixelsPerUnit;
    const screenY =
      canvasBottom - (block.z + block.height / 2 - bounds.minZ) * pixelsPerUnit;
    const blockWidth = block.width * pixelsPerUnit;
    const blockHeight = block.height * pixelsPerUnit;

    context.fillStyle = colourCss(
      colourForValue(scale, block.attributes[scale.field]),
    );
    context.fillRect(screenX, screenY, blockWidth, blockHeight);
    if (blockWidth > 1.5 && blockHeight > 1.5)
      context.strokeRect(screenX, screenY, blockWidth, blockHeight);
  }
}

function getSectionBounds(blocks: readonly Block[]): SectionBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const block of blocks) {
    minX = Math.min(minX, block.x - block.width / 2);
    maxX = Math.max(maxX, block.x + block.width / 2);
    minZ = Math.min(minZ, block.z - block.height / 2);
    maxZ = Math.max(maxZ, block.z + block.height / 2);
  }

  return { minX, maxX, minZ, maxZ };
}

function fitSectionToCanvas(
  bounds: SectionBounds,
  width: number,
  height: number,
  padding: number,
) {
  const sectionWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const sectionHeight = Math.max(bounds.maxZ - bounds.minZ, 1);
  const pixelsPerUnit = Math.min(
    (width - padding * 2) / sectionWidth,
    (height - padding * 2) / sectionHeight,
  );
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const canvasBottom = height - padding;

  return { pixelsPerUnit, centreX, canvasBottom };
}
