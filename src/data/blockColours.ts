import { categoryFields, gradeFields } from "./blockModels";
import type { Block, ColourField } from "./blockModels";

export const missingColour = 0x8c939e;
export const gradientStops = [0x440154, 0x3b528b, 0x21918c, 0x5ec962, 0xfde725];
const categoryPalette = [
  0x56b4e9, 0xe69f00, 0x009e73, 0xcc79a7, 0xf0e442, 0x0072b2,
];

export type ColourScale = { field: ColourField; missingCount: number } & (
  | { kind: "category"; entries: { value: number; colour: number }[] }
  | { kind: "grade" | "movement"; min: number | null; max: number | null }
);

export const colourValue = (block: Block, field: ColourField): number | null =>
  field === "movementDistance" ? block.movementDistance : block.attributes[field];

export function createColourScale(
  blocks: readonly Block[],
  field: ColourField,
): ColourScale {
  const categorical = field.startsWith("cat_");
  const values = new Set<number>();
  let min = Infinity;
  let max = -Infinity;
  let missingCount = 0;

  for (const block of blocks) {
    const value = colourValue(block, field);
    if (value === null || !Number.isFinite(value)) {
      missingCount += 1;
      continue;
    }
    if (categorical) values.add(value);
    else {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (categorical)
    return {
      field,
      missingCount,
      kind: "category",
      entries: [...values]
        .sort((a, b) => a - b)
        .map((value, index) => ({
          value,
          colour: categoryPalette[index % categoryPalette.length],
        })),
    };

  return {
    field,
    missingCount,
    kind: field === "movementDistance" ? "movement" : "grade",
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  };
}

export function createColourScales(blocks: readonly Block[]): Map<ColourField, ColourScale> {
  return new Map([...gradeFields, ...categoryFields, "movementDistance" as const].map((field) => [field, createColourScale(blocks, field)]));
}

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

const lerpChannel = (from: number, to: number, shift: number, t: number): number => {
  const c1 = (from >> shift) & 0xff;
  const c2 = (to >> shift) & 0xff;
  return Math.round(c1 + (c2 - c1) * t);
};

export function colourForValue(
  scale: ColourScale,
  value: number | null,
): number {
  if (value === null || !Number.isFinite(value)) return missingColour;

  if (scale.kind === "category") {
    return (
      scale.entries.find((entry) => entry.value === value)?.colour ??
      missingColour
    );
  }

  if (scale.min === null || scale.max === null || gradientStops.length === 0) {
    return missingColour;
  }
  if (gradientStops.length === 1) return gradientStops[0];

  const t = scale.min === scale.max ? 0.5 : clamp((value - scale.min) / (scale.max - scale.min), 0, 1);
  const maxIndex = gradientStops.length - 1;
  const position = t * maxIndex;
  const index = Math.min(Math.floor(position), maxIndex - 1);
  const blend = position - index;

  const from = gradientStops[index];
  const to = gradientStops[index + 1];

  const r = lerpChannel(from, to, 16, blend);
  const g = lerpChannel(from, to, 8, blend);
  const b = lerpChannel(from, to, 0, blend);

  return (r << 16) | (g << 8) | b;
}

export const colourCss = (hex: number): string =>
  "#" + hex.toString(16).padStart(6, "0");
