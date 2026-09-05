import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

/**
 * Auth state backed by Firebase Authentication.
 * A matching profile document is kept in Firestore at users/{uid}.
 */
const useAuthStore = create((set, get) => ({
  user: null, // { id, email, fullName, subscriptionPlan, ...profile }
  loading: true,
  error: null,

  // Subscribe to Firebase auth changes. Call once on app start.
  initAuth: () => {
    onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({ user: null, loading: false })
        return
      }

      let profile = {}
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (snap.exists()) profile = snap.data()
      } catch (e) {
        console.error('Could not load profile:', e)
      }

      set({
        user: {
          id: fbUser.uid,
          email: fbUser.email,
          fullName: profile.fullName || fbUser.displayName || fbUser.email,
          subscriptionPlan: profile.subscriptionPlan || 'free',
          affiliateAmazonTag: profile.affiliateAmazonTag || '',
          affiliateEbayCampaign: profile.affiliateEbayCampaign || '',
          affiliateGenericQs: profile.affiliateGenericQs || '',
          defaultFeePct: profile.defaultFeePct ?? 15,
          defaultShipping: profile.defaultShipping ?? 0,
        },
        loading: false,
      })
    })
  },

  // Merge fields into the user's Firestore profile and local state.
  updateProfile: async (patch) => {
    const u = get().user
    if (!u?.id) throw new Error('Not signed in')
    await setDoc(
      doc(db, 'users', u.id),
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true }
    )
    set({ user: { ...u, ...patch } })
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // onAuthStateChanged fills in user
    } catch (error) {
      const message = friendlyAuthError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  register: async (email, password, fullName) => {
    set({ error: null })
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)

      if (fullName) {
        await updateProfile(cred.user, { displayName: fullName })
      }

      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        fullName: fullName || email,
        subscriptionPlan: 'free',
        createdAt: serverTimestamp(),
      })
      // onAuthStateChanged fills in user
    } catch (error) {
      const message = friendlyAuthError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  logout: async () => {
    await signOut(auth)
    set({ user: null })
  },
}))

function friendlyAuthError(error) {
  const code = error?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered'
    case 'auth/invalid-email':
      return 'Enter a valid email address'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password'
    case 'auth/too-many-requests':
      return 'Too many attempts - try again later'
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase yet'
    default:
      return error?.message || 'Authentication failed'
  }
}

export { useAuthStore }
