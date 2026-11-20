# Augment Web Challenge

This is a 3D viewer for reviewing a blast using Augment’s OMP results. It helps you spot where the biggest shifts are expected and look more closely at a section or block.

## Run it locally

Use Node.js 22.12 or later. Put `1_mbm.csv`, `1_pre_string.csv` and `1_pst_string.csv` in `data/`.

Add `1_pre_surface.csv` and `1_pst_surface.csv` for the survey surfaces, and `1_blastholes.csv` for the blast hole overlay.

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal.

## Try it out

1. Press **Play** or scrub the timeline to see where the blocks are predicted to move.
2. Use **Colour** to explore grades, categories or movement distance.
3. Open **Slice model**, move the Northing slider and choose **Inspect section**. Select a block to compare its pre-blast and predicted post-blast positions.

## Tests

Run `npm test`. The Vitest suite uses synthetic data and includes a React Testing Library test for the grade filter.
