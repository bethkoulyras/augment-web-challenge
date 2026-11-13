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

Place the supplied `input/1_blockmodel.csv` at `data/private/1_blockmodel.csv`. This directory is excluded from version control.

The local Vite server streams and validates every CSV row, then returns the block positions and dimensions through `/api/blocks`. The browser passes all blocks to the viewer. Source data is not bundled into the application, and no data file is needed to build it.

This local data endpoint works with `npm run dev` and `npm run preview`. A deployed application will need its own data source; the static build does not include a server. Keep the confidential dataset outside `src/` and `public/`.

The viewer uses GPU instancing to share one cube geometry across the blocks and fits the camera to the full model. Drag to orbit, scroll to zoom, and right-drag to pan. Rendering happens when the view changes. Face colours show orientation, not mineral grades.

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
- `src/App.tsx` — application layout and loading/error presentation.
- `src/hooks/useBlockModel.ts` — data fetching lifecycle, loading state, errors, and request cancellation.
- `src/components/SceneViewer.tsx` — connects the viewer lifecycle to React.
- `src/viewer/Viewer.ts` — Three.js scene, camera, rendering, resizing, and cleanup.
- `src/data/Block.ts` — position and dimensions of a block.
- `src/data/fetchBlocks.ts` — fetches the blocks from the local server.
- `server/readBlocksFromCsv.ts` — streams and validates the block-model CSV.
- `src/style.css` — global styles and Tailwind configuration.
- `vite.config.ts` — Vite configuration.
