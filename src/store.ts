import { create } from 'zustand'
import type { ShapeId } from './shapes'

export type AppState = {
  /** Number of tiers (the "Effector" value). */
  effector: number
  shape: ShapeId
  paletteIndex: number

  rotate: boolean
  wave: boolean
  speed: number
  playing: boolean

  /** Bumped to request a camera + time reset from the 3D scene. */
  resetToken: number
  /** Bumped to request a PNG export from the 3D scene. */
  exportToken: number

  setEffector: (n: number) => void
  setShape: (s: ShapeId) => void
  setPalette: (i: number) => void
  toggleRotate: () => void
  toggleWave: () => void
  setSpeed: (s: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  reset: () => void
  requestExport: () => void
}

export const MIN_EFFECTOR = 1
export const MAX_EFFECTOR = 20
export const MIN_SPEED = 0
export const MAX_SPEED = 2

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const useStore = create<AppState>((set) => ({
  effector: 5,
  shape: 'pyramid',
  paletteIndex: 0,

  rotate: true,
  wave: false,
  speed: 0.4,
  playing: true,

  resetToken: 0,
  exportToken: 0,

  setEffector: (n) =>
    set({ effector: clamp(Math.round(n), MIN_EFFECTOR, MAX_EFFECTOR) }),
  setShape: (shape) => set({ shape }),
  setPalette: (paletteIndex) => set({ paletteIndex }),
  toggleRotate: () => set((s) => ({ rotate: !s.rotate })),
  toggleWave: () => set((s) => ({ wave: !s.wave })),
  setSpeed: (speed) =>
    set({ speed: clamp(Math.round(speed * 100) / 100, MIN_SPEED, MAX_SPEED) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  reset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  requestExport: () => set((s) => ({ exportToken: s.exportToken + 1 })),
}))
