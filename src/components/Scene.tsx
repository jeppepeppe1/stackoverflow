import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { useStore, MP4_SUPPORTED } from '../store'
import { buildShape, TIER_HEIGHT } from '../shapes'
import Stack from './Stack'

// Classic isometric direction: 45° azimuth, ~35.26° elevation.
const ISO_DIR = new THREE.Vector3(1, 1, 1).normalize()
const CAM_DISTANCE = 20

/**
 * Fits the orthographic zoom so the stack fills ~50% of the height — but only
 * as a one-shot animation when the shape, tier count, viewport, or reset
 * changes. Once it settles it stops touching the zoom, so OrbitControls scroll
 * zoom sticks and you can zoom right up to the model.
 */
function AutoFit() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)
  const effector = useStore((s) => s.effector)
  const shape = useStore((s) => s.shape)
  const resetToken = useStore((s) => s.resetToken)

  // Non-null while a fit animation is in progress; null when idle (user owns zoom).
  const targetZoom = useRef<number | null>(null)

  useEffect(() => {
    const built = buildShape(shape, effector)
    const w = built.maxWidth
    const height = effector * TIER_HEIGHT
    // Rotation-invariant fit via the bounding-sphere radius.
    const radius = 0.5 * Math.sqrt(w * w + w * w + height * height)
    // Fill ~50% of the viewport height -> sphere radius ~= 25% of height (px).
    targetZoom.current = (0.25 * size.height) / radius
  }, [shape, effector, size.height, resetToken])

  useFrame(() => {
    const target = targetZoom.current
    if (target == null) return
    const next = THREE.MathUtils.lerp(camera.zoom, target, 0.15)
    camera.zoom = next
    camera.updateProjectionMatrix()
    // Close enough: snap and hand zoom control back to the user.
    if (Math.abs(target - next) < 0.01) {
      camera.zoom = target
      camera.updateProjectionMatrix()
      targetZoom.current = null
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
      zoomSpeed={1.2}
      minZoom={1}
      maxZoom={2000}
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

// Card background (--card in index.css). MP4 has no alpha channel, so frames are
// composited over this opaque color — otherwise transparency encodes as black.
const CARD_BG = '#1f1e1f'
// Cap the long side so the H.264 level stays within encoder limits and files
// stay reasonable; the WebGL canvas is often retina-sized (e.g. 3376px wide).
const MAX_DIM = 1280
const FPS = 60
const BITRATE = 8_000_000
// H.264 profiles to try, best quality first. avc1.42E01E is intentionally
// absent: several GPUs claim support for it yet encode nothing.
const H264_CODECS = ['avc1.4D0028', 'avc1.640028', 'avc1.42E028', 'avc1.42001F']

/** State held while a recording is in flight; drives the per-frame encode. */
type ActiveRecording = {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  encoder: VideoEncoder
  start: number // performance.now() at first frame
  lastTs: number // last timestamp (µs), kept strictly increasing
  frames: number
}

/**
 * Records the live scene to an MP4 whenever a recording is requested. Captures
 * from the current animation state (no reset) for the selected duration.
 *
 * We do NOT capture the WebGL canvas directly: `captureStream()` on a
 * GPU-accelerated WebGL canvas frequently delivers zero frames to the encoder
 * (producing an empty file). Instead we blit each rendered frame into a plain
 * 2D canvas and record that — 2D-canvas capture is reliable across GPUs and
 * also composites the opaque card background for us.
 */
function Recorder() {
  const gl = useThree((s) => s.gl)
  const recordToken = useStore((s) => s.recordToken)
  const last = useRef(recordToken)
  // Non-null only while recording; the render loop encodes into it each frame.
  const active = useRef<ActiveRecording | null>(null)

  // Encode the freshly rendered WebGL canvas every frame. Runs after r3f's own
  // render (default useFrame priority), so it picks up the current frame
  // (preserveDrawingBuffer keeps it readable).
  useFrame(() => {
    const a = active.current
    if (!a || a.encoder.state !== 'configured') return
    // Don't outrun the encoder; drop a frame rather than blow up memory.
    if (a.encoder.encodeQueueSize > 8) return

    a.ctx.fillStyle = CARD_BG
    a.ctx.fillRect(0, 0, a.w, a.h)
    a.ctx.drawImage(gl.domElement, 0, 0, a.w, a.h)

    let ts = Math.round((performance.now() - a.start) * 1000) // µs
    if (ts <= a.lastTs) ts = a.lastTs + 1 // timestamps must strictly increase
    a.lastTs = ts
    const frame = new VideoFrame(a.ctx.canvas, { timestamp: ts })
    try {
      a.encoder.encode(frame, { keyFrame: a.frames % FPS === 0 })
    } finally {
      frame.close()
    }
    a.frames++
  })

  // No cleanup here on purpose: under React StrictMode the effect runs
  // mount -> cleanup -> mount, and stopping the recorder in a cleanup would
  // abort the clip instantly (producing a 0-byte file). The recording is
  // self-contained: it starts here and stops on its own timer.
  useEffect(() => {
    if (recordToken === last.current) return
    last.current = recordToken
    if (!MP4_SUPPORTED) return

    const { recordDuration, setRecording, setRecordError } = useStore.getState()
    const source = gl.domElement as HTMLCanvasElement

    const fail = (msg: string, err?: unknown) => {
      console.error(`[stacks] ${msg}`, err ?? '')
      active.current = null
      setRecordError(msg)
      setRecording(false)
    }

    const run = async () => {
      // Downscale to even dimensions within the encoder's limits.
      const scale = Math.min(1, MAX_DIM / Math.max(source.width, source.height))
      const w = Math.max(2, Math.round((source.width * scale) / 2) * 2)
      const h = Math.max(2, Math.round((source.height * scale) / 2) * 2)

      let codec = ''
      for (const c of H264_CODECS) {
        try {
          const probe = await VideoEncoder.isConfigSupported({
            codec: c,
            width: w,
            height: h,
            bitrate: BITRATE,
            framerate: FPS,
          })
          if (probe.supported) {
            codec = c
            break
          }
        } catch {
          /* try the next profile */
        }
      }
      if (!codec) return fail('this browser has no supported H.264 encoder')

      const rc = document.createElement('canvas')
      rc.width = w
      rc.height = h
      const ctx = rc.getContext('2d')
      if (!ctx) return fail('could not create a 2D recording context')

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: w, height: h, frameRate: FPS },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset', // first frame won't land exactly at 0
      })
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => fail('encoder error', e),
      })
      encoder.configure({ codec, width: w, height: h, bitrate: BITRATE, framerate: FPS })

      active.current = {
        ctx,
        w,
        h,
        encoder,
        start: performance.now(),
        lastTs: -1,
        frames: 0,
      }
      setRecording(true)

      window.setTimeout(async () => {
        const a = active.current
        if (!a) return // already failed/aborted
        active.current = null // stop the per-frame encode loop
        try {
          await encoder.flush()
          muxer.finalize()
          const { buffer } = muxer.target
          setRecording(false)
          if (!buffer || buffer.byteLength === 0 || a.frames === 0) {
            setRecordError('no frames were captured')
            return
          }
          const blob = new Blob([buffer], { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `stacks-${Date.now()}.mp4`
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (e) {
          fail('could not finalize the MP4', e)
        }
      }, recordDuration * 1000)
    }

    run().catch((e) => fail('recording failed to start', e))
  }, [recordToken, gl])

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
      <Recorder />
    </Canvas>
  )
}
