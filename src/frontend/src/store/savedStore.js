import { create } from 'zustand'
import { getSaved, addSaved, removeSaved } from '../lib/data'

/**
 * Shared "saved deals" set so the star toggles consistently everywhere and
 * we only read the list once per session.
 */
export const useSavedStore = create((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async (uid) => {
    if (!uid || get().loaded) return
    try {
      const list = await getSaved(uid)
      set({ ids: new Set(list.map((x) => x.productId || x.id)), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  toggle: async (uid, p) => {
    if (!uid || !p?.id) return
    const ids = new Set(get().ids)
    if (ids.has(p.id)) {
      ids.delete(p.id)
      set({ ids })
      try {
        await removeSaved(uid, p.id)
      } catch {
        /* ignore */
      }
    } else {
      ids.add(p.id)
      set({ ids })
      try {
        await addSaved(uid, p)
      } catch {
        /* ignore */
      }
    }
  },

  reset: () => set({ ids: new Set(), loaded: false }),
}))
