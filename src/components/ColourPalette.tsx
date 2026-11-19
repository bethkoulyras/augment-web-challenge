import { categoryFields, gradeFields } from "../data/blockModels";
import type { ColourField } from "../data/blockModels";
import { colourCss, gradientStops } from "../data/blockColours";
import type { ColourScale } from "../data/blockColours";

interface ColourPaletteProps {
  scale: ColourScale;
  collapsed: boolean;
  onToggle: () => void;
  onChange: (field: ColourField) => void;
}

const format = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 3 });

export default function ColourPalette({ scale, onChange, collapsed, onToggle }: ColourPaletteProps) {
  const categorical = scale.kind === "category";
  const fields = categorical ? categoryFields : gradeFields;

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
        <span>Colour by <span className="ml-2 font-mono text-neutral-200">{scale.field}</span></span>
        <span aria-hidden="true">{collapsed ? "▾" : "▴"}</span>
      </button>

      <div id="colour-palette-controls" hidden={collapsed} className="space-y-4">
        <div
          role="group"
          aria-label="Colour field type"
          className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-950 p-1"
        >
          <button
            type="button"
            aria-pressed={!categorical}
            onClick={() => {
              if (categorical) onChange(gradeFields[0]);
            }}
            className="cursor-pointer rounded-md px-3 py-2 text-neutral-500 transition-colors hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:bg-neutral-800 aria-pressed:text-white"
          >
            Grades
          </button>
          <button
            type="button"
            aria-pressed={categorical}
            onClick={() => {
              if (!categorical) onChange(categoryFields[0]);
            }}
            className="cursor-pointer rounded-md px-3 py-2 text-neutral-500 transition-colors hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:bg-neutral-800 aria-pressed:text-white"
          >
            Categories
          </button>
        </div>

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

      </div>

      <div
        aria-label="Colour legend"
        className="space-y-3 border-t border-white/10 pt-4"
      >
        {scale.kind === "category" ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {scale.entries.map((entry) => (
              <div key={entry.value} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: colourCss(entry.colour) }}
                />
                <span>Code {format(entry.value)}</span>
              </div>
            ))}
          </div>
        ) : scale.min === null || scale.max === null ? (
          <p>No values available.</p>
        ) : (
          <div className="space-y-2">
            <div
              aria-hidden="true"
              className="h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, " +
                  gradientStops.map(colourCss).join(", ") +
                  ")",
              }}
            />
            <div className="flex justify-between gap-3 tabular-nums">
              <span>
                <span className="mr-1 text-neutral-500">Low</span>{" "}
              </span>
              <span>
                <span className="mr-1 text-neutral-500">High</span>{" "}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
