const MAP = {
  'BUY NOW': 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  WATCH: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  SKIP: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

export default function SignalBadge({ rec, className = '' }) {
  const key = rec || 'WATCH'
  return (
    <span className={`chip ${MAP[key] || MAP.WATCH} ${className}`}>
      {key === 'BUY NOW' && '🔥 '}
      {key}
    </span>
  )
}
