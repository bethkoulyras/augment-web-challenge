import { categoryFields, gradeFields } from "../data/blockModels";
import type { ReactNode } from "react";
import type { ColourField, GradeFilter } from "../data/blockModels";
import { colourCss, gradientStops } from "../data/blockColours";
import type { ColourScale } from "../data/blockColours";

interface ColourPaletteProps {
  scale: ColourScale;
  gradeFilter: GradeFilter | null;
  categoryCode: number | null;
  onCategoryCodeChange: (value: number | null) => void;
  children?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  onChange: (field: ColourField) => void;
}

const format = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 3 });

const codeButton = "flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-400 aria-pressed:bg-neutral-700 aria-pressed:text-white";

export default function ColourPalette({ scale, onChange, collapsed, onToggle, gradeFilter, categoryCode, onCategoryCodeChange, children }: ColourPaletteProps) {
  const categorical = scale.kind === "category";
  const fields = categorical ? categoryFields : scale.kind === "grade" ? gradeFields : [];

  return (
    <section
      aria-label="Block colour palette"
      className="shrink-0 space-y-4 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-xs text-neutral-300 shadow-2xl backdrop-blur-md"
    >
      <button
        type="button"
        aria-label={collapsed ? "Expand colour palette" : "Minimise colour palette"}
        aria-expanded={!collapsed}
        aria-controls="colour-palette-controls"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-neutral-300"
      >
        <span>Colour by <span className="ml-2 font-mono text-neutral-200">{scale.kind === "movement" ? "Movement (m)" : scale.field}</span></span>
        <span aria-hidden="true">{collapsed ? "▾" : "▴"}</span>
      </button>

      <div id="colour-palette-controls" hidden={collapsed} className="space-y-4">
        <div
          role="group"
          aria-label="Colour field type"
          className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-950 p-1"
        >
          {([
            ["grade", "Grades", gradeFields[0]],
            ["category", "Categories", categoryFields[0]],
            ["movement", "Movement", "movementDistance"],
          ] as const).map(([kind, label, field]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={scale.kind === kind}
              onClick={() => { if (scale.kind !== kind) onChange(field); }}
              className="cursor-pointer rounded-md px-2 py-2 text-neutral-500 transition-colors hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:bg-neutral-800 aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </div>

        {fields.length > 0 && (
          <div
            role="group"
            aria-label={categorical ? "Category fields" : "Grade fields"}
            className={
              "grid gap-1.5 " + (categorical ? "grid-cols-3" : "grid-cols-6")
            }
          >
            {fields.map((field) => (
              <button
                key={field}
                type="button"
                title={field}
                aria-label={"Colour by " + field}
                aria-pressed={scale.field === field}
                onClick={() => onChange(field)}
                className="cursor-pointer rounded-md border border-neutral-700/70 bg-neutral-800/40 py-2 font-mono text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-700 aria-pressed:text-neutral-100"
              >
                {categorical ? field : field.slice(6)}
              </button>
            ))}
          </div>
        )}
        {children}
        {scale.kind === "category" && (
          <div role="group" aria-label="Category codes" className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              aria-pressed={categoryCode === null}
              onClick={() => onCategoryCodeChange(null)}
              className={codeButton + " col-span-2 justify-center"}
            >
              All codes
            </button>
            {scale.entries.map(({ value, colour }) => (
              <button
                key={value}
                type="button"
                aria-pressed={categoryCode === value}
                onClick={() => onCategoryCodeChange(categoryCode === value ? null : value)}
                className={codeButton}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colourCss(colour) }} />
                Code {format(value)}
              </button>
            ))}
          </div>
        )}
      </div>
      {collapsed && gradeFilter && (
        <p className="text-neutral-400">Minimum {gradeFilter.field} ≥ {format(gradeFilter.minimum)}</p>
      )}
      {collapsed && categoryCode !== null && (
        <p className="text-neutral-400">Code {format(categoryCode)} selected</p>
      )}

      {scale.kind !== "category" && (
        <div aria-label="Colour legend" className="space-y-2 border-t border-white/10 pt-4">
          {scale.min === null || scale.max === null ? (
            <p>No values available.</p>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="h-2 rounded-full"
                style={{ background: `linear-gradient(to right, ${gradientStops.map(colourCss).join(", ")})` }}
              />
              <div className="flex justify-between gap-3 text-neutral-500 tabular-nums">
                <span>{scale.kind === "movement" ? format(scale.min) + " m" : "Low"}</span>
                <span>{scale.kind === "movement" ? format(scale.max) + " m" : "High"}</span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
