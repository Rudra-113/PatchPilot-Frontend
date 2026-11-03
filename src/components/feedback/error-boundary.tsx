import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/components/feedback/states'

interface BoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-6 py-16">
          <ErrorState error={this.state.error} onRetry={() => window.location.reload()} />
        </div>
      )
    }
    return this.props.children
  }
}
