import { create } from 'zustand'
import { apiFetch } from '../lib/api'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  initAuth: () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      set({
        token: storedToken,
        user: JSON.parse(storedUser)
      })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) throw new Error('Login failed')

      const { data } = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      set({
        user: data.user,
        token: data.token,
        loading: false
      })
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  register: async (email, password, fullName) => {
    set({ loading: true, error: null })
    try {
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName })
      })

      if (!response.ok) throw new Error('Registration failed')

      const { data } = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      set({
        user: data.user,
        token: data.token,
        loading: false
      })
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  }
}))

export { useAuthStore }
