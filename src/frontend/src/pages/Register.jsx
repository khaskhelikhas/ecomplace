import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AuthShell } from './Login'

export default function Register() {
  const navigate = useNavigate()
  const { register, error } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      alert('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.fullName)
      navigate('/')
    } catch {
      /* error from store */
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink-900">Create your account</h1>
      <p className="text-ink-500 text-sm mt-1 mb-6">Takes 20 seconds. No card.</p>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="label">Full name</label>
          <input className="field" name="fullName" value={form.fullName} onChange={change} placeholder="Safdar Ali" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password</label>
            <input className="field" type="password" name="password" value={form.password} onChange={change} placeholder="••••••••" required />
          </div>
          <div>
            <label className="label">Confirm</label>
            <input className="field" type="password" name="confirm" value={form.confirm} onChange={change} placeholder="••••••••" required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-ink-500 mt-6 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
