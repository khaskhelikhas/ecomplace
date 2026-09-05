import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, error } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch {
      /* error shown from store */
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink-900">Welcome back</h1>
      <p className="text-ink-500 text-sm mt-1 mb-6">Sign in to track deals and price alerts.</p>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" type="password" name="password" value={form.password} onChange={change} placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-ink-500 mt-6 text-center">
        New here?{' '}
        <Link to="/register" className="text-brand-600 font-semibold hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-600 text-white p-12">
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-white/15">🛍️</span>
          EcomPlace
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Real deals.<br />Smart signals.<br />Zero noise.
          </h2>
          <p className="text-white/80 mt-4 max-w-sm">
            Best prices from Amazon, Walmart, eBay, Home Depot and more — refreshed
            every 20 minutes, each tagged buy / watch / skip.
          </p>
        </div>
        <p className="text-white/60 text-sm">Free forever · no card required</p>
      </div>

      <div className="flex items-center justify-center p-6 bg-[#f6f7fb]">
        <div className="w-full max-w-md card p-8">
          <div className="lg:hidden flex items-center gap-2 font-extrabold text-lg text-brand-600 mb-6">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50">🛍️</span>
            EcomPlace
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
