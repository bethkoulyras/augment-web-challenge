import { categoryFields, gradeFields } from "../data/blockModels";
import { useState } from "react";
import type { ReactNode } from "react";
import type { ColourField } from "../data/blockModels";
import { colourCss, gradientStops } from "../data/blockColours";
import type { ColourScale } from "../data/blockColours";

interface ColourPaletteProps {
  scale: ColourScale;
  filtered: boolean;
  categoryCode: number | null;
  onCategoryCodeChange: (value: number | null) => void;
  children?: ReactNode;
  onChange: (field: ColourField) => void;
}

const format = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 3 });

const codeButton = "flex cursor-pointer items-center gap-2 rounded-sm border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-400 aria-pressed:bg-neutral-700 aria-pressed:text-white";

export default function ColourPalette({ scale, onChange, filtered, categoryCode, onCategoryCodeChange, children }: ColourPaletteProps) {
  const [open, setOpen] = useState(true);
  const categorical = scale.kind === "category";
  const fields = categorical ? categoryFields : scale.kind === "grade" ? gradeFields : [];

  return (
    <section aria-label="Colour palette">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="colour-palette-controls"
          aria-description={!open && filtered ? "Colour filter active" : undefined}
          onClick={() => setOpen((current) => !current)}
          className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-neutral-100 hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-300"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-neutral-400">
            <path fillRule="evenodd" d="M12 3a9 9 0 1 0 0 18h1.2a1.9 1.9 0 0 0 1.45-3.12 1.1 1.1 0 0 1 .85-1.8H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3ZM8 8.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4-2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4 2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" />
          </svg>
          Colour
          <span className="ml-auto font-mono text-xs font-normal text-neutral-400">{scale.kind === "movement" ? "Movement (m)" : scale.field}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-neutral-400 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div
        id="colour-palette-controls"
        inert={!open}
        className={"grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none " + (open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 px-3 pb-3">
            <div
              role="group"
              aria-label="Colour field type"
              className="grid grid-cols-3 gap-1 rounded-sm bg-neutral-950 p-1"
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
                  className="cursor-pointer rounded-sm px-0.5 py-2 text-[11px] text-neutral-500 transition-colors hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:bg-neutral-800 aria-pressed:text-white sm:px-2 sm:text-xs"
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
                    className="cursor-pointer rounded-sm border border-neutral-700/70 bg-neutral-800/40 py-2 font-mono text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-700 aria-pressed:text-neutral-100"
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
          </div>
        </div>
      </div>
    </section>
  );
}
