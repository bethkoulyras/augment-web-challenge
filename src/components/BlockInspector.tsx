import { colourValue } from '../data/blockColours'
import type { Block, ColourField } from '../data/blockModels'

interface BlockInspectorProps {
  block: Block
  field: ColourField
}

export default function BlockInspector({ block, field }: BlockInspectorProps) {
  const value = colourValue(block, field)

  return (
    <section aria-label="Block inspector" className="space-y-3 p-4">
      <h2 className="text-sm font-medium text-neutral-100">Block {block.id}</h2>
      <div>
        <p className="text-neutral-400">Predicted movement</p>
        <p className="mt-1 text-3xl leading-tight font-semibold tracking-tight text-neutral-100 tabular-nums">{block.movementDistance.toFixed(2)} m</p>
      </div>
      <table className="w-full text-right tabular-nums">
        <caption className="mb-2 text-left text-neutral-400">Coordinates (m)</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Axis</th>
            <th scope="col" className="pb-2 font-normal">Pre-blast</th>
            <th scope="col" className="pb-2 font-normal">Predicted post-blast</th>
          </tr>
        </thead>
        <tbody>
          {([['x', 'Easting'], ['y', 'Northing'], ['z', 'Elevation']] as const).map(([axis, label]) => (
            <tr key={axis}>
              <th scope="row" className="py-1 text-left font-normal text-neutral-400">{label}</th>
              <td>{block[axis].toFixed(2)}</td>
              <td>{block.predicted[axis].toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {field !== 'movementDistance' && (
        <dl className="flex justify-between gap-3 border-t border-white/10 pt-3 font-mono">
          <dt className="text-neutral-400">{field}</dt>
          <dd>{value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 3 })}</dd>
        </dl>
      )}
    </section>
  )
}
