import { useAuthStore } from '../store/authStore'
import { useSavedStore } from '../store/savedStore'

/**
 * One-click save / watchlist star. Renders nothing for signed-out users.
 * `product` needs at least { id, name }; more fields are stored if present.
 */
export default function SaveButton({ product, size = 'md', className = '' }) {
  const { user } = useAuthStore()
  const ids = useSavedStore((s) => s.ids)
  const toggle = useSavedStore((s) => s.toggle)
  if (!user || !product?.id) return null

  const on = ids.has(product.id)
  const box = size === 'sm' ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg'

  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? 'Saved — click to remove' : 'Save to watchlist'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(user.id, product)
      }}
      className={`grid place-items-center rounded-full shadow-sm transition ${box} ${
        on
          ? 'bg-amber-100 text-amber-500'
          : 'bg-white/90 text-slate-400 hover:text-amber-500'
      } ${className}`}
    >
      {on ? '★' : '☆'}
    </button>
  )
}
