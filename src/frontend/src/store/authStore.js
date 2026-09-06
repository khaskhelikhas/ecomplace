import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
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

      let isAdmin = false
      try {
        const tok = await fbUser.getIdTokenResult()
        isAdmin = tok.claims.admin === true
      } catch {
        /* ignore */
      }

      set({
        user: {
          id: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
          isAdmin,
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

  resendVerification: async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser)
    }
  },

  // Re-enter the password (step-up auth, e.g. before opening the admin panel).
  reauth: async (password) => {
    const fbUser = auth.currentUser
    if (!fbUser?.email) throw new Error('Not signed in')
    try {
      await reauthenticateWithCredential(
        fbUser,
        EmailAuthProvider.credential(fbUser.email, password)
      )
    } catch (e) {
      throw new Error(friendlyAuthError(e))
    }
  },

  // Re-read the Firestore profile (e.g. after an admin approves an upgrade).
  refreshProfile: async () => {
    const fbUser = auth.currentUser
    const u = get().user
    if (!fbUser || !u) return
    try {
      await fbUser.reload()
      const snap = await getDoc(doc(db, 'users', fbUser.uid))
      const profile = snap.exists() ? snap.data() : {}
      let isAdmin = u.isAdmin
      try {
        isAdmin = (await fbUser.getIdTokenResult(true)).claims.admin === true
      } catch {
        /* ignore */
      }
      set({
        user: {
          ...u,
          isAdmin,
          emailVerified: fbUser.emailVerified,
          subscriptionPlan: profile.subscriptionPlan || 'free',
          fullName: profile.fullName || u.fullName,
          affiliateAmazonTag: profile.affiliateAmazonTag || '',
          affiliateEbayCampaign: profile.affiliateEbayCampaign || '',
          affiliateGenericQs: profile.affiliateGenericQs || '',
          defaultFeePct: profile.defaultFeePct ?? 15,
          defaultShipping: profile.defaultShipping ?? 0,
        },
      })
    } catch {
      /* ignore */
    }
  },

  // Permanently delete the account and its data.
  deleteAccount: async (password) => {
    const fbUser = auth.currentUser
    if (!fbUser) throw new Error('Not signed in')

    // Recent-login requirement.
    if (password) {
      try {
        await reauthenticateWithCredential(
          fbUser,
          EmailAuthProvider.credential(fbUser.email, password)
        )
      } catch (e) {
        throw new Error(friendlyAuthError(e))
      }
    }

    const uid = fbUser.uid
    // Best-effort cleanup of the user's data.
    try {
      const alerts = await getDocs(
        query(collection(db, 'alerts'), where('userId', '==', uid))
      )
      await Promise.all(alerts.docs.map((d) => deleteDoc(d.ref)))
      const sourcing = await getDocs(collection(db, 'users', uid, 'sourcing'))
      await Promise.all(sourcing.docs.map((d) => deleteDoc(d.ref)))
    } catch (e) {
      console.warn('data cleanup partial:', e)
    }
    // The users/{uid} doc: delete is disabled by rules, so blank it out.
    try {
      await setDoc(doc(db, 'users', uid), { deletedAt: serverTimestamp() }, { merge: true })
    } catch {
      /* ignore */
    }

    try {
      await deleteUser(fbUser)
    } catch (e) {
      throw new Error(friendlyAuthError(e))
    }
    set({ user: null })
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

      try {
        await sendEmailVerification(cred.user)
      } catch {
        /* non-fatal */
      }
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

  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      throw new Error(friendlyAuthError(error))
    }
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
