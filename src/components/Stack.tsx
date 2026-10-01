import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { PALETTES } from '../palettes'
import { buildShape, easeInOut, TIER_HEIGHT, type TierTransform } from '../shapes'

const SHAPE_TWEEN = 0.6 // seconds for shape / effector transitions
const PALETTE_FADE = 0.3 // seconds for palette cross-fade
const EXIT_SCALE: [number, number, number] = [0, 0, 0]

type TierAnim = {
  curPos: THREE.Vector3
  curScale: THREE.Vector3
  curRot: number
  startPos: THREE.Vector3
  startScale: THREE.Vector3
  startRot: number
  targetPos: THREE.Vector3
  targetScale: THREE.Vector3
  targetRot: number
  tStart: number
}

function newAnim(target: TierTransform, enter: boolean, now: number): TierAnim {
  const targetPos = new THREE.Vector3(...target.position)
  const targetScale = new THREE.Vector3(...target.scale)
  // Entering tiers scale in from zero, starting at their destination position.
  const startScale = enter ? new THREE.Vector3(0, 0, 0) : targetScale.clone()
  return {
    curPos: targetPos.clone(),
    curScale: startScale.clone(),
    curRot: target.rotationY,
    startPos: targetPos.clone(),
    startScale: startScale.clone(),
    startRot: target.rotationY,
    targetPos: targetPos.clone(),
    targetScale: targetScale.clone(),
    targetRot: target.rotationY,
    tStart: now,
  }
}

export default function Stack() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const anims = useRef<TierAnim[]>([])

  const effector = useStore((s) => s.effector)
  const shape = useStore((s) => s.shape)
  const paletteIndex = useStore((s) => s.paletteIndex)
  const resetToken = useStore((s) => s.resetToken)

  // Live animation clock (advances only while playing); spin accumulator.
  const tRef = useRef(0)
  const spinRef = useRef(0)

  // Number of tier meshes actually mounted. Grows immediately, shrinks after
  // the exit tween so removed tiers can scale out before unmounting.
  const [renderCount, setRenderCount] = useState(effector)
  useEffect(() => {
    if (effector > renderCount) {
      setRenderCount(effector)
    } else if (effector < renderCount) {
      const t = setTimeout(() => setRenderCount(effector), SHAPE_TWEEN * 1000 + 50)
      return () => clearTimeout(t)
    }
  }, [effector, renderCount])

  // Recompute tier targets whenever the shape or count changes.
  const built = useMemo(() => buildShape(shape, effector), [shape, effector])
  useEffect(() => {
    const now = performance.now() / 1000
    for (let i = 0; i < renderCount; i++) {
      const active = i < built.tiers.length
      const target: TierTransform = active
        ? built.tiers[i]
        : // Exiting tier: keep last position, scale out to zero.
          {
            position: (anims.current[i]?.curPos.toArray() as [number, number, number]) ?? [0, 0, 0],
            scale: EXIT_SCALE,
            rotationY: anims.current[i]?.curRot ?? 0,
          }
      const existing = anims.current[i]
      if (!existing) {
        anims.current[i] = newAnim(target, true, now)
      } else {
        existing.startPos.copy(existing.curPos)
        existing.startScale.copy(existing.curScale)
        existing.startRot = existing.curRot
        existing.targetPos.set(...target.position)
        existing.targetScale.set(...target.scale)
        existing.targetRot = target.rotationY
        existing.tStart = now
      }
    }
    anims.current.length = renderCount
  }, [built, renderCount])

  // ---- Shared geometries ----
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 64), [])
  useEffect(() => () => {
    boxGeo.dispose()
    cylGeo.dispose()
  }, [boxGeo, cylGeo])

  // ---- Shared face materials (flat, exact color, no shading) ----
  const mats = useMemo(() => {
    const make = (hex: string) =>
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), toneMapped: false })
    const p = PALETTES[0]
    return { top: make(p.top), front: make(p.front), side: make(p.side) }
  }, [])
  useEffect(() => () => {
    mats.top.dispose()
    mats.front.dispose()
    mats.side.dispose()
  }, [mats])

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  const boxMats = useMemo(
    () => [mats.side, mats.side, mats.top, mats.top, mats.front, mats.front],
    [mats],
  )
  // CylinderGeometry material order: wall, top cap, bottom cap
  const cylMats = useMemo(() => [mats.front, mats.top, mats.top], [mats])

  // Palette cross-fade bookkeeping.
  const fade = useRef({
    from: { top: new THREE.Color(), front: new THREE.Color(), side: new THREE.Color() },
    to: { top: new THREE.Color(), front: new THREE.Color(), side: new THREE.Color() },
    tStart: -1,
    active: false,
  })
  const lastPalette = useRef(paletteIndex)
  useEffect(() => {
    if (paletteIndex === lastPalette.current) return
    const p = PALETTES[paletteIndex]
    fade.current.from.top.copy(mats.top.color)
    fade.current.from.front.copy(mats.front.color)
    fade.current.from.side.copy(mats.side.color)
    fade.current.to.top.set(p.top)
    fade.current.to.front.set(p.front)
    fade.current.to.side.set(p.side)
    fade.current.tStart = performance.now() / 1000
    fade.current.active = true
    lastPalette.current = paletteIndex
  }, [paletteIndex, mats])

  // Reset: zero the clock, spin, and rest pose.
  const lastReset = useRef(resetToken)
  useEffect(() => {
    if (resetToken === lastReset.current) return
    lastReset.current = resetToken
    tRef.current = 0
    spinRef.current = 0
    if (groupRef.current) groupRef.current.rotation.y = 0
  }, [resetToken])

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05) // clamp long frames (e.g. tab refocus)
    const now = performance.now() / 1000
    const { playing, rotate, wave, speed } = useStore.getState()

    if (playing) tRef.current += dt

    // Whole-object spin.
    if (groupRef.current) {
      if (rotate && playing) spinRef.current += dt * speed * 0.5
      groupRef.current.rotation.y = spinRef.current
    }

    // Palette cross-fade.
    if (fade.current.active) {
      const p = Math.min(1, (now - fade.current.tStart) / PALETTE_FADE)
      mats.top.color.copy(fade.current.from.top).lerp(fade.current.to.top, p)
      mats.front.color.copy(fade.current.from.front).lerp(fade.current.to.front, p)
      mats.side.color.copy(fade.current.from.side).lerp(fade.current.to.side, p)
      if (p >= 1) fade.current.active = false
    }

    // Per-tier tween + wave.
    for (let i = 0; i < anims.current.length; i++) {
      const a = anims.current[i]
      const mesh = meshRefs.current[i]
      if (!a || !mesh) continue
      const p = Math.min(1, (now - a.tStart) / SHAPE_TWEEN)
      const e = easeInOut(p)
      a.curPos.lerpVectors(a.startPos, a.targetPos, e)
      a.curScale.lerpVectors(a.startScale, a.targetScale, e)
      a.curRot = a.startRot + (a.targetRot - a.startRot) * e

      const waveY = wave ? Math.sin(tRef.current * speed * 4 + i * 0.6) * 0.12 : 0
      mesh.position.set(a.curPos.x, a.curPos.y + waveY, a.curPos.z)
      mesh.scale.copy(a.curScale)
      mesh.rotation.y = a.curRot
    }
  })

  const geo = built.kind === 'cylinder' ? cylGeo : boxGeo
  const tierMats = built.kind === 'cylinder' ? cylMats : boxMats

  return (
    <group ref={groupRef}>
      {Array.from({ length: renderCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => (meshRefs.current[i] = m)}
          geometry={geo}
          material={tierMats}
          position={[0, (i + 0.5) * TIER_HEIGHT, 0]}
          scale={[0, 0, 0]}
        />
      ))}
    </group>
  )
}
