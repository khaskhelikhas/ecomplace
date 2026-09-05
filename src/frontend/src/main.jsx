import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
    <App />
  </React.StrictMode>,
)
