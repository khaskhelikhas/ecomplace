import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { track } from './lib/firebase'
import './index.css'

// Catch anything React's boundary misses.
window.addEventListener('error', (e) =>
  track('window_error', { message: String(e?.message || '').slice(0, 140) })
)
window.addEventListener('unhandledrejection', (e) =>
  track('unhandled_rejection', { message: String(e?.reason?.message || e?.reason || '').slice(0, 140) })
)

// No service worker: this is a live-data site, a cached app shell only causes
// stale deploys. Clean up any worker a previous version installed.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
