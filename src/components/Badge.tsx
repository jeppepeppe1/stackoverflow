export default function Badge() {
  return (
    <div className="badge">
      <span>Interactive</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* cursor */}
        <path
          d="M5 3l6.5 15.5 2.2-5.8 5.8-2.2L5 3z"
          fill="currentColor"
        />
        {/* sparkle */}
        <path
          d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}
