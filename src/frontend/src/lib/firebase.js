import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics'

// These values are safe to expose in client code - Firebase security is
// enforced by Authentication and Firestore security rules, not by hiding
// this config.
const firebaseConfig = {
  apiKey: 'AIzaSyCEqStZAkxvhDCc7IZgIaB20k75EBwUEP0',
  authDomain: 'ecomplace-app-4db34.firebaseapp.com',
  projectId: 'ecomplace-app-4db34',
  storageBucket: 'ecomplace-app-4db34.firebasestorage.app',
  messagingSenderId: '77163836828',
  appId: '1:77163836828:web:3ef990765917788ce54459',
  measurementId: 'G-SCDNXXNQH9',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Analytics — best effort, no-ops where unsupported (SSR, blocked, etc.)
let _analytics = null
isSupported()
  .then((ok) => {
    if (ok) _analytics = getAnalytics(app)
  })
  .catch(() => {})

export function track(event, params = {}) {
  try {
    if (_analytics) logEvent(_analytics, event, params)
  } catch {
    /* ignore */
  }
}
