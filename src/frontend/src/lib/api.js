/**
 * API base URL.
 *
 * - In development it is empty, so requests go to "/api/..." and Vite's
 *   dev proxy forwards them to the local backend on port 5000.
 * - In production set VITE_API_URL (e.g. in .env.production or the build
 *   environment) to the deployed backend origin, e.g.
 *   https://ecomplace-api.onrender.com
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/**
 * Build a full API URL from a path that starts with "/api".
 */
export const apiUrl = (path) => `${API_BASE}${path}`

/**
 * Thin fetch wrapper that prefixes the API base and always sends JSON.
 */
export const apiFetch = (path, options = {}) =>
  fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
