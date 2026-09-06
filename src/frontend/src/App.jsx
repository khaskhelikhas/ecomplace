import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import VerifyBanner from './components/VerifyBanner'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import { useAuthStore } from './store/authStore'
import './App.css'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProductList = lazy(() => import('./pages/ProductList'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Sourcing = lazy(() => import('./pages/Sourcing'))
const Settings = lazy(() => import('./pages/Settings'))
const Upgrade = lazy(() => import('./pages/Upgrade'))
const Admin = lazy(() => import('./pages/Admin'))
const Analyzer = lazy(() => import('./pages/Analyzer'))

const Spinner = () => (
  <div className="max-w-7xl mx-auto px-4 py-16 text-center text-ink-400 text-sm">Loading…</div>
)

function App() {
  const { user, loading, initAuth, refreshProfile } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  // Pick up plan / verification changes when the tab regains focus.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') refreshProfile()
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshProfile])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-ink-400">Loading…</div>
  }

  return (
    <BrowserRouter>
      {user && <Navbar />}
      {user && <VerifyBanner />}
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* always public */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

          {user ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/sourcing" element={<Sourcing />} />
              <Route path="/analyzer" element={<Analyzer />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/upgrade" element={<Upgrade />} />
              {user.isAdmin && <Route path="/admin" element={<Admin />} />}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </Suspense>

      {user && (
        <footer className="max-w-7xl mx-auto px-4 py-10 text-center text-xs text-ink-400 border-t border-slate-200 mt-8">
          Deal data from public feeds (DealNews · Slickdeals). Outbound links may
          earn EcomPlace a commission at no cost to you. Signals are heuristic
          estimates, not financial advice. ·{' '}
          <a href="/deals" className="hover:underline">Public deals</a> ·{' '}
          <a href="/terms" className="hover:underline">Terms</a> ·{' '}
          <a href="/privacy" className="hover:underline">Privacy</a>
        </footer>
      )}
    </BrowserRouter>
  )
}

export default App
