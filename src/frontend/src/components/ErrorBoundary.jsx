import { Component } from 'react'
import { track } from '../lib/firebase'

export default class ErrorBoundary extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info)
    track('app_error', {
      message: String(error?.message || error).slice(0, 140),
      where: (info?.componentStack || '').split('\n')[1]?.trim().slice(0, 80) || '',
    })
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="text-2xl font-bold text-ink-900">Something went wrong</p>
          <p className="text-ink-500 mt-2">The error has been logged.</p>
          <button
            onClick={() => {
              this.setState({ crashed: false })
              window.location.assign('/')
            }}
            className="btn-primary mt-6"
          >
            Back to start
          </button>
        </div>
      </div>
    )
  }
}
