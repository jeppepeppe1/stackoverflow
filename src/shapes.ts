export type ShapeId = 'pyramid' | 'twist' | 'stack' | 'circle'

export const SHAPES: { id: ShapeId; label: string }[] = [
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'twist', label: 'Twist' },
  { id: 'stack', label: 'Stack' },
  { id: 'circle', label: 'Circle' },
]

/** Height of a single tier slab, in relative scene units. */
export const TIER_HEIGHT = 0.25

export type GeomKind = 'box' | 'cylinder'

export type TierTransform = {
  /** World position of the tier center (the whole stack is centered on the origin). */
  position: [number, number, number]
  /** Scale applied to a unit geometry. For boxes: [w, h, w]. For cylinders: [r, h, r]. */
  scale: [number, number, number]
  /** Rotation about the Y axis, in radians. */
  rotationY: number
}

export type ShapeResult = {
  kind: GeomKind
  tiers: TierTransform[]
  /** Rough horizontal full-width of the shape, used for camera auto-fit. */
  maxWidth: number
}

/**
 * Pure function: given a shape and a tier count N, return the rest-pose
 * transform of every tier. The stack is vertically centered on the origin.
 */
export function buildShape(shape: ShapeId, n: number): ShapeResult {
  const N = Math.max(1, Math.round(n))
  const h = TIER_HEIGHT
  const totalHeight = N * h
  // Center the whole stack vertically on the origin.
  const yOf = (i: number) => (i + 0.5) * h - totalHeight / 2

  const tiers: TierTransform[] = []

  switch (shape) {
    case 'pyramid': {
      for (let i = 0; i < N; i++) {
        const w = 4 * (1 - i / N) // top tier stays visible (w = 4/N > 0)
        tiers.push({ position: [0, yOf(i), 0], scale: [w, h, w], rotationY: 0 })
      }
      return { kind: 'box', tiers, maxWidth: 4 }
    }
    case 'twist': {
      const w = 3
      const step = Math.PI / 2 / N // 90° spread over N tiers
      for (let i = 0; i < N; i++) {
        tiers.push({ position: [0, yOf(i), 0], scale: [w, h, w], rotationY: i * step })
      }
      // Rotated squares reach out to half-diagonal w*sqrt(2)/2 each side.
      return { kind: 'box', tiers, maxWidth: w * Math.SQRT2 }
    }
    case 'stack': {
      const w = 2.5
      const o = 0.15
      for (let i = 0; i < N; i++) {
        const x = (i % 2 === 0 ? 1 : -1) * o
        const z = (i % 2 === 0 ? -1 : 1) * o
        tiers.push({ position: [x, yOf(i), z], scale: [w, h, w], rotationY: 0 })
      }
      return { kind: 'box', tiers, maxWidth: w + 2 * o }
    }
    case 'circle': {
      for (let i = 0; i < N; i++) {
        const r = 2 * (1 - i / N) // radius shrinks toward the top
        tiers.push({ position: [0, yOf(i), 0], scale: [r, h, r], rotationY: 0 })
      }
      return { kind: 'cylinder', tiers, maxWidth: 4 } // diameter of base = 4
    }
  }
}

/** easeInOutCubic */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
