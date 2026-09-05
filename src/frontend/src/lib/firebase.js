import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// These values are safe to expose in client code - Firebase security is
// enforced by Authentication and Firestore security rules, not by hiding
// this config.
const firebaseConfig = {
  apiKey: 'AIzaSyCyMOO6-R-y41UN9nxx_1SZhr5XitidZRc',
  authDomain: 'ecomplace-app.firebaseapp.com',
  projectId: 'ecomplace-app',
  storageBucket: 'ecomplace-app.firebasestorage.app',
  messagingSenderId: '475397419538',
  appId: '1:475397419538:web:aaf8570cdbb06eabaa9ecb',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
