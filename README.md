# Augment Web Challenge

A web application built with React, TypeScript, Three.js, and Tailwind CSS, powered by Vite.

## Getting started

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal.

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
- `src/App.tsx` — main React component and Three.js scene.
- `src/style.css` — global styles and Tailwind configuration.
- `vite.config.ts` — Vite configuration.
