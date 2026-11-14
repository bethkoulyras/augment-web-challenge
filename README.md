# Augment Web Challenge

A web application built with React, TypeScript, Three.js, and Tailwind CSS, powered by Vite.

## Getting started

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal.

## Local challenge data

Place the supplied files at these locations. The private directory is excluded from version control.

| Supplied file | Local path |
| --- | --- |
| `input/1_blockmodel.csv` | `data/private/1_blockmodel.csv` |
| `output/1_mbm.csv` | `data/private/1_mbm.csv` |

The local Vite server streams and validates both CSVs, then matches every input block to its OMP output by numeric `IJK`. Original coordinates and dimensions must agree, and missing or duplicate matches are rejected. Output grid locations without an input block ID are excluded.

The `/api/block-model` endpoint returns two sets of block positions and dimensions in the same input order. Pre-blast uses the original centres; predicted post-blast uses `XF`, `YF` and `ZF` from the OMP output. All input blocks are retained in both views. Source data is not bundled into the application, and no data file is needed to build it.

The response is compressed and cached in server memory. Restart the dev or preview server after replacing either CSV.

This local data endpoint works with `npm run dev` and `npm run preview`. A deployed application will need its own data source; the static build does not include a server. Keep the confidential dataset outside `src/` and `public/`.

Use the **Pre-blast** and **Predicted post-blast** tabs to switch positions in a single viewer. Switching preserves the camera, zoom and pan. The tab controls also support arrow keys, Home and End.

The viewer uses GPU instancing to share one cube geometry across the blocks and initially fits the camera to both model extents. Drag to orbit, scroll to zoom, and right-drag to pan. Rendering happens when the view changes. Face colours show orientation, not mineral grades.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run typecheck` | Run TypeScript checks. |
| `npm run build` | Check types and build for production. |
| `npm run preview` | Preview the production build locally. |

Production files are generated in `dist/`.

## Project structure

- `src/main.tsx` — application entry point.
- `src/App.tsx` — model tabs, application layout and loading/error presentation.
- `src/hooks/useBlockModel.ts` — data fetching lifecycle, loading state, errors, and request cancellation.
- `src/components/SceneViewer.tsx` — connects the viewer lifecycle to React.
- `src/viewer/Viewer.ts` — Three.js scene, camera, rendering, resizing, and cleanup.
- `src/data/Block.ts` — position and dimensions of a block.
- `src/data/BlockModel.ts` — the original and predicted block sets and active-view type.
- `src/data/fetchBlockModel.ts` — fetches both model views from the local server.
- `server/readBlocksFromCsv.ts` — streams and validates the block-model CSV.
- `server/readBlockModelFromCsv.ts` — matches the OMP output to the original blocks and reads final positions.
- `server/readCsvRows.ts` — shared streaming CSV parsing and numeric validation.
- `server/blockDataPlugin.ts` — local data endpoint and response cache.
- `src/style.css` — global styles and Tailwind configuration.
- `vite.config.ts` — Vite configuration.
