import { categoryFields, gradeFields } from '../data/Block'
import type { AttributeField } from '../data/Block'
import { colourCss, gradientStops, missingColour } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'

interface ColourControlsProps {
  field: AttributeField
  scale: ColourScale
  onChange: (field: AttributeField) => void
}

const format = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 3 })

export default function ColourControls({ field, scale, onChange }: ColourControlsProps) {
  return (
    <section aria-label="Block colouring" className="space-y-3 border-t border-neutral-700 pt-3">
      <label className="block space-y-2">
        <span className="font-medium">Colour by</span>
        <select className="block w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-2 text-sm" value={field} onChange={(event) => onChange(event.target.value as AttributeField)}>
          <optgroup label="Grades">{gradeFields.map((value) => <option key={value}>{value}</option>)}</optgroup>
          <optgroup label="Categories">{categoryFields.map((value) => <option key={value}>{value}</option>)}</optgroup>
        </select>
      </label>
      <div aria-label="Colour legend" className="space-y-2">
        {scale.kind === 'category'
          ? <div className="grid grid-cols-2 gap-2">{scale.entries.map((entry) => <div key={entry.value} className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: colourCss(entry.colour) }} />Code {entry.value}</div>)}</div>
          : scale.min === null || scale.max === null
            ? <p>No values available.</p>
            : <>
                <div aria-hidden="true" className="h-3 rounded" style={{ background: 'linear-gradient(to right, ' + gradientStops.map(colourCss).join(', ') + ')' }} />
                <div className="flex justify-between gap-4 tabular-nums"><span>Low · {format(scale.min)}</span><span>High · {format(scale.max)}</span></div>
              </>}
        <p className="flex items-center gap-2 text-neutral-400"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: colourCss(missingColour) }} />Missing · {scale.missingCount.toLocaleString()} blocks</p>
      </div>
    </section>
  )
}
