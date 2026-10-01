import { useEffect, useState } from 'react'
import Scene from './components/Scene'
import SceneBoundary from './components/SceneBoundary'
import ControlPanel from './components/ControlPanel'
import ShapeBar from './components/ShapeBar'
import Badge from './components/Badge'
import { useStore } from './store'
import { SHAPES } from './shapes'

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Keyboard: 1–4 select shapes, Space toggles play/pause, R resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const { setShape, togglePlay, reset } = useStore.getState()
      if (e.key >= '1' && e.key <= '4') {
        const idx = Number(e.key) - 1
        if (SHAPES[idx]) setShape(SHAPES[idx].id)
      } else if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'r' || e.key === 'R') {
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <div className="stage">
        <SceneBoundary>
          <Scene />
        </SceneBoundary>

        <Badge />

        <button
          className="drawer-toggle"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label="Toggle controls"
          aria-expanded={drawerOpen}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className={`panel-wrap${drawerOpen ? ' open' : ''}`}>
          <ControlPanel />
        </div>
        {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}

        <ShapeBar />
      </div>
    </div>
  )
}
