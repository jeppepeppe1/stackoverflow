import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStore } from '../store'
import { buildShape, TIER_HEIGHT } from '../shapes'
import Stack from './Stack'

// Classic isometric direction: 45° azimuth, ~35.26° elevation.
const ISO_DIR = new THREE.Vector3(1, 1, 1).normalize()
const CAM_DISTANCE = 20

/** Keeps the orthographic zoom fitted so the stack fills ~50% of the height. */
function AutoFit() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)
  const effector = useStore((s) => s.effector)
  const shape = useStore((s) => s.shape)
  const targetZoom = useRef(50)

  useEffect(() => {
    const built = buildShape(shape, effector)
    const w = built.maxWidth
    const height = effector * TIER_HEIGHT
    // Rotation-invariant fit via the bounding-sphere radius.
    const radius = 0.5 * Math.sqrt(w * w + w * w + height * height)
    // Fill ~50% of the viewport height -> sphere radius ~= 25% of height (px).
    targetZoom.current = (0.25 * size.height) / radius
  }, [shape, effector, size.height])

  useFrame(() => {
    const z = camera.zoom
    const next = THREE.MathUtils.lerp(z, targetZoom.current, 0.15)
    if (Math.abs(next - z) > 0.01) {
      camera.zoom = next
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const resetToken = useStore((s) => s.resetToken)
  const lastReset = useRef(resetToken)

  // Establish the default isometric view once.
  useEffect(() => {
    camera.position.copy(ISO_DIR.clone().multiplyScalar(CAM_DISTANCE))
    camera.lookAt(0, 0, 0)
  }, [camera])

  useEffect(() => {
    if (resetToken === lastReset.current) return
    lastReset.current = resetToken
    camera.position.copy(ISO_DIR.clone().multiplyScalar(CAM_DISTANCE))
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
  }, [resetToken, camera])

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      makeDefault
    />
  )
}

/** Renders a PNG snapshot whenever an export is requested. */
function Exporter() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const exportToken = useStore((s) => s.exportToken)
  const last = useRef(exportToken)

  useEffect(() => {
    if (exportToken === last.current) return
    last.current = exportToken
    gl.render(scene, camera) // ensure the buffer is fresh
    const url = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `stacks-${Date.now()}.png`
    link.click()
  }, [exportToken, gl, scene, camera])

  return null
}

export default function Scene() {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      camera={{ position: [20, 20, 20], zoom: 50, near: -100, far: 200 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.setClearColor(0x000000, 0) // transparent: card color shows through
      }}
    >
      <Stack />
      <CameraRig />
      <AutoFit />
      <Exporter />
    </Canvas>
  )
}
