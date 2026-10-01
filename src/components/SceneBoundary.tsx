import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * Isolates the WebGL canvas: if a context can't be created (headless env,
 * blocklisted GPU, lost context), the 2D controls still render instead of the
 * whole app going blank.
 */
export default class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="scene-fallback">
          <p>Couldn’t start WebGL on this device.</p>
          <p className="muted">The 3D view needs hardware-accelerated WebGL.</p>
        </div>
      )
    }
    return this.props.children
  }
}
