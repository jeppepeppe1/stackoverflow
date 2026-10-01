# Stacks

An interactive isometric 3D stack generator. Build stepped pyramids, twisted
towers, offset stacks, and concentric cylinders, then animate them with rotate
and wave motion — all rendered in a flat, graphic, shadeless isometric style.

Built with **Vite + React + TypeScript**, **three / @react-three/fiber /
@react-three/drei**, and **zustand**.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run typecheck  # strict type-check only
```

## Controls

**Left panel**

- **Stacks → Effector** — number of tiers (1–20, default 5). Slider and number
  input stay in sync; invalid input is clamped on blur.
- **Scene & Colors → Stack palettes** — pick one of four 6-color palettes. The
  3D face colors cross-fade (~300 ms) when switched.
- **Animate**
  - **Rotate** / **Wave** — independent toggles (both can be on).
  - **Speed** — 0–2, step 0.1 (default 0.4).
  - **Play / Pause / Reset** — Play starts the clock, Pause freezes it in place,
    Reset returns time to 0, restores the rest pose, and recenters the camera.
  - **Export PNG** — downloads a snapshot of the canvas.

**Bottom bar** — choose the shape: Pyramid / Twist / Stack / Circle.

**Keyboard**

- `1`–`4` — select a shape
- `Space` — toggle play / pause
- `R` — reset

**Mouse** — drag to orbit, scroll to zoom (no panning).

## How it works

- `src/shapes.ts` — pure functions returning per-tier transforms (position,
  scale, rotation) for a given shape and tier count `N`.
- `src/palettes.ts` — the four palettes and their `top` / `front` / `side` face
  colors.
- `src/store.ts` — zustand store holding all UI state.
- `src/components/Stack.tsx` — the tiers. A single `useFrame` loop drives
  everything: a ~600 ms ease-in-out tween of each tier's position/scale/rotation
  on shape or count changes (tiers scale in/out as they are added/removed), the
  palette cross-fade, the whole-object spin, and the per-tier wave.
- `src/components/Scene.tsx` — orthographic isometric camera with auto-fit
  (keeps the object ~50% of the canvas height, centered on resize), OrbitControls,
  and PNG export. Tone mapping is disabled and sRGB output is kept so on-screen
  hex values match the palette exactly.

The render is deliberately flat: `MeshBasicMaterial` with a different solid
color per face orientation (top / front-facing / right-facing), no lights, no
shadows, transparent background.
