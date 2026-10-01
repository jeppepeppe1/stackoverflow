import { useEffect, useState } from 'react'
import {
  useStore,
  MIN_EFFECTOR,
  MAX_EFFECTOR,
  MIN_SPEED,
  MAX_SPEED,
} from '../store'
import { PALETTES } from '../palettes'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  )
}

export default function ControlPanel() {
  const effector = useStore((s) => s.effector)
  const setEffector = useStore((s) => s.setEffector)
  const paletteIndex = useStore((s) => s.paletteIndex)
  const setPalette = useStore((s) => s.setPalette)
  const rotate = useStore((s) => s.rotate)
  const wave = useStore((s) => s.wave)
  const toggleRotate = useStore((s) => s.toggleRotate)
  const toggleWave = useStore((s) => s.toggleWave)
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  const play = useStore((s) => s.play)
  const pause = useStore((s) => s.pause)
  const reset = useStore((s) => s.reset)
  const requestExport = useStore((s) => s.requestExport)

  // Local text buffers so invalid intermediate typing is allowed until blur.
  const [effText, setEffText] = useState(String(effector))
  const [spdText, setSpdText] = useState(speed.toFixed(1))
  useEffect(() => setEffText(String(effector)), [effector])
  useEffect(() => setSpdText(speed.toFixed(1)), [speed])

  const commitEffector = () => {
    const n = parseInt(effText, 10)
    if (Number.isFinite(n)) setEffector(n)
    else setEffText(String(effector))
  }
  const commitSpeed = () => {
    const n = parseFloat(spdText)
    if (Number.isFinite(n)) setSpeed(n)
    else setSpdText(speed.toFixed(1))
  }

  return (
    <div className="panel">
      <Section title="Stacks">
        <label className="field-label" htmlFor="effector-range">
          Effector
        </label>
        <div className="slider-row">
          <input
            id="effector-range"
            className="slider"
            type="range"
            min={MIN_EFFECTOR}
            max={MAX_EFFECTOR}
            step={1}
            value={effector}
            onChange={(e) => setEffector(Number(e.target.value))}
          />
          <input
            className="num"
            type="number"
            min={MIN_EFFECTOR}
            max={MAX_EFFECTOR}
            step={1}
            value={effText}
            onChange={(e) => setEffText(e.target.value)}
            onBlur={commitEffector}
            onKeyDown={(e) => e.key === 'Enter' && commitEffector()}
            aria-label="Effector value"
          />
        </div>
      </Section>

      <Section title="Scene & Colors">
        <span className="field-label">Stack palettes</span>
        <div className="palette-grid">
          {PALETTES.map((p, i) => (
            <button
              key={i}
              className={`palette-btn${paletteIndex === i ? ' selected' : ''}`}
              onClick={() => setPalette(i)}
              aria-pressed={paletteIndex === i}
              aria-label={`Palette ${i + 1}`}
            >
              {p.swatches.map((c, j) => (
                <span key={j} className="swatch" style={{ background: c }} />
              ))}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Animate">
        <div className="toggle-row">
          <button
            className={`toggle${rotate ? ' active' : ''}`}
            onClick={toggleRotate}
            aria-pressed={rotate}
          >
            Rotate
          </button>
          <button
            className={`toggle${wave ? ' active' : ''}`}
            onClick={toggleWave}
            aria-pressed={wave}
          >
            Wave
          </button>
        </div>

        <label className="field-label" htmlFor="speed-range">
          Speed
        </label>
        <div className="slider-row">
          <input
            id="speed-range"
            className="slider"
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <input
            className="num"
            type="number"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.1}
            value={spdText}
            onChange={(e) => setSpdText(e.target.value)}
            onBlur={commitSpeed}
            onKeyDown={(e) => e.key === 'Enter' && commitSpeed()}
            aria-label="Speed value"
          />
        </div>

        <div className="icon-row">
          <button className="icon-btn" onClick={play} aria-label="Play" title="Play">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M8 5l11 7-11 7V5z" fill="currentColor" />
            </svg>
          </button>
          <button className="icon-btn" onClick={pause} aria-label="Pause" title="Pause">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
            </svg>
          </button>
          <button className="icon-btn" onClick={reset} aria-label="Reset" title="Reset">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M4 10a8 8 0 1 1 1.5 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M4 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <button className="export-btn" onClick={requestExport} title="Export PNG">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export PNG
        </button>
      </Section>
    </div>
  )
}
