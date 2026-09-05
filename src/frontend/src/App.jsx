import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Alerts from './pages/Alerts'
import Sourcing from './pages/Sourcing'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import Navbar from './components/Navbar'
import { useAuthStore } from './store/authStore'
import './App.css'

function App() {
  const { user, loading, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        {/* Protected routes */}
        {user && (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/sourcing" element={<Sourcing />} />
            <Route path="/settings" element={<Settings />} />
          </>
        )}

        <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
      </Routes>

      {user && (
        <footer className="max-w-7xl mx-auto px-4 py-10 text-center text-xs text-ink-400 border-t border-slate-200 mt-8">
          Deal data from public feeds (DealNews · Slickdeals). Outbound links may
          earn EcomPlace a commission at no cost to you. Signals are heuristic
          estimates, not financial advice.
        </footer>
      )}
    </BrowserRouter>
  )
}

export default App
