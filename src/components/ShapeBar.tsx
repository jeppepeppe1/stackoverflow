import { useStore } from '../store'
import { SHAPES } from '../shapes'

export default function ShapeBar() {
  const shape = useStore((s) => s.shape)
  const setShape = useStore((s) => s.setShape)

  return (
    <div className="shapebar" role="group" aria-label="Shape">
      {SHAPES.map((s) => (
        <button
          key={s.id}
          className={`shape-btn${shape === s.id ? ' active' : ''}`}
          onClick={() => setShape(s.id)}
          aria-pressed={shape === s.id}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
