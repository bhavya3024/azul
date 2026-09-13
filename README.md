# Azul

The tile-drafting board game Azul, played against a CPU opponent. Built with React, TypeScript, and Vite.

## Features

- Full rules: factory displays, the center pool and first-player marker, pattern lines, wall tiling with
  adjacency scoring, floor penalties, and end-game bonuses (+2 per row, +7 per column, +10 per color)
- CPU opponent that runs an alpha-beta search over the rest of the round in a Web Worker, scoring round-end
  results and game-ending bonuses exactly
- Placement previews showing where tiles land, the points a completed line will score, and floor penalties
- Discard a pick before placing it; keyboard shortcuts (`1`–`5` line, `F` floor, `Esc` discard)
- Game progress saved to `localStorage`, so a reload resumes the game; cancel a game at any time
- Animations throughout, respecting `prefers-reduced-motion`; tiles scale up on larger screens

## Run it

Requires Node.js 20.19+ (Vite 8).

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
