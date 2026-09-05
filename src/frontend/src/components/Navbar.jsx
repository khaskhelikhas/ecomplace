import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const link = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`

  return (
    <nav className="bg-brand-600 text-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/15">🛍️</span>
            EcomPlace
          </NavLink>

          <div className="hidden sm:flex items-center gap-1">
            <NavLink to="/" end className={link}>
              Dashboard
            </NavLink>
            <NavLink to="/products" className={link}>
              Deals
            </NavLink>
            <NavLink to="/alerts" className={link}>
              Alerts
            </NavLink>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/10 text-sm"
            >
              <span className="grid place-items-center w-7 h-7 rounded-full bg-white/20 font-semibold">
                {(user?.fullName || user?.email || '?')[0].toUpperCase()}
              </span>
              <span className="hidden sm:block max-w-[140px] truncate">{user?.email}</span>
              <span className="text-white/70">▾</span>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 card text-ink-900 py-1 z-20">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold truncate">{user?.fullName}</p>
                    <p className="text-xs text-ink-500 truncate">{user?.email}</p>
                    <span className="chip bg-brand-50 text-brand-700 mt-2 capitalize">
                      {user?.subscriptionPlan} plan
                    </span>
                  </div>
                  <div className="sm:hidden border-b border-slate-100 py-1">
                    <NavLink to="/" end className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
                      Dashboard
                    </NavLink>
                    <NavLink to="/products" className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
                      Deals
                    </NavLink>
                    <NavLink to="/alerts" className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
                      Alerts
                    </NavLink>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
