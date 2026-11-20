# Augment Web Challenge

I built a 3D viewer to make it easier to see where material is predicted to move after a blast. It uses the supplied OMP output to show the original and predicted block positions.

## Run it locally

Use Node.js 22.12 or later. Put `1_mbm.csv`, `1_pre_string.csv` and `1_pst_string.csv` in `data/private/`.

Add `1_pre_surface.csv` and `1_pst_surface.csv` for the survey surfaces, and `1_blastholes.csv` for the blast hole overlay.

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal.

Keep the supplied CSVs private. If you run `npm run build` with the data in place, Vite copies the CSVs into `dist/`. Keep that build private too.

## Try it out

1. Press **Play** or scrub the timeline to see where the blocks are predicted to move.
2. Use **Colour** to explore grades, categories or movement distance.
3. Open **Slice model**, move the Northing slider and choose **Inspect section**. Select a block to compare its pre-blast and predicted post-blast positions.

## Tests

Run `npm test`. The Vitest suite uses synthetic data and includes a React Testing Library test for the grade filter.
