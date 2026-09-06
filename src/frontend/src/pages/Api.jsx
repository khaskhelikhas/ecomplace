import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/plans'

const BASE = 'https://ecomplace-app-4db34.web.app'
const ENDPOINTS = [
  { path: '/api/deals.json', desc: 'Every live deal, scored, refreshed every 20 min.' },
  { path: '/api/deals.buy-now.json', desc: 'Only the deals currently rated BUY NOW.' },
  { path: '/api/meta.json', desc: 'Counts, source list, category list, last refresh time.' },
]

function makeToken() {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return 'ecp_' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export default function Api() {
  const { user, updateProfile } = useAuthStore()
  const enabled = can(user, 'api')

  if (!enabled) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl">🔌</div>
        <h1 className="text-2xl font-bold mt-3">Deals API</h1>
        <p className="text-ink-500 mt-2">
          Pull our full scored deal feed as JSON into your own tools, sheets,
          bots or storefront — refreshed every 20 minutes.
        </p>
        <ul className="text-sm text-ink-600 mt-5 space-y-1.5 text-left inline-block">
          <li>✓ <code>/api/deals.json</code> — every live deal</li>
          <li>✓ <code>/api/deals.buy-now.json</code> — just the strong buys</li>
          <li>✓ CORS-open, no server to run</li>
          <li>✓ Up to 5 team seats on the same plan</li>
        </ul>
        <div className="mt-6">
          <Link to="/upgrade" className="btn-primary">
            Unlock with Agency →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Deals API</h1>
        <p className="text-ink-500 text-sm">
          Static JSON, regenerated every 20 minutes with the rest of the site.
          CORS is open, so you can call it straight from a browser, a sheet or a
          server.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold">Endpoints</h2>
        {ENDPOINTS.map((e) => (
          <div key={e.path} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <code className="text-sm font-mono text-brand-700 break-all">
                {BASE}
                {e.path}
              </code>
              <Copy text={`${BASE}${e.path}`} />
            </div>
            <p className="text-xs text-ink-500 mt-1.5">{e.desc}</p>
          </div>
        ))}
      </section>

      <TokenPanel user={user} updateProfile={updateProfile} />

      <TeamPanel user={user} updateProfile={updateProfile} />

      <section className="space-y-3">
        <h2 className="font-bold">Quick start</h2>
        <Sample
          label="curl"
          code={`curl -s ${BASE}/api/deals.buy-now.json | jq '.deals[0]'`}
        />
        <Sample
          label="JavaScript"
          code={`const r = await fetch('${BASE}/api/deals.json')
const { deals } = await r.json()
const strong = deals.filter(d => d.signal === 'BUY NOW')
console.log(strong.length, 'strong buys')`}
        />
        <Sample
          label="Python"
          code={`import requests
deals = requests.get("${BASE}/api/deals.json").json()["deals"]
buys = [d for d in deals if d["signal"] == "BUY NOW"]
print(len(buys), "strong buys")`}
        />
        <Sample
          label="Google Sheets"
          code={`=IMPORTDATA("${BASE}/api/meta.json")`}
        />
      </section>

      <section className="card p-4 text-sm text-ink-600">
        <h2 className="font-bold text-ink-900 mb-1">Fields</h2>
        <p className="text-xs">
          <code>id, name, category, source, url</code> (affiliate-tagged),{' '}
          <code>page</code> (public deal page), <code>price, listPrice,
          discountPct, signal</code> (BUY NOW / WATCH / SKIP),{' '}
          <code>dealScore, dropChance, flipMargin, trend, reason, image</code>.
        </p>
      </section>

      <p className="text-xs text-ink-400">
        Fair use: this is a static file on a CDN — cache responses for a minute or
        two rather than polling in a tight loop. Heavy or commercial
        redistribution needs written permission.
      </p>
    </div>
  )
}

function TokenPanel({ user, updateProfile }) {
  const [busy, setBusy] = useState(false)
  const token = user?.apiToken || ''

  const gen = async () => {
    setBusy(true)
    try {
      await updateProfile({ apiToken: makeToken() })
    } finally {
      setBusy(false)
    }
  }
  const revoke = async () => {
    if (!confirm('Revoke this token? Any integration using it keeps working for now (the feed is open) but the identifier is cleared.')) return
    setBusy(true)
    try {
      await updateProfile({ apiToken: '' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-bold">Your token</h2>
      <div className="card p-4">
        {token ? (
          <div className="flex items-center justify-between gap-3">
            <code className="text-sm font-mono break-all">{token}</code>
            <div className="flex gap-2 shrink-0">
              <Copy text={token} />
              <button onClick={revoke} disabled={busy} className="text-xs text-rose-600 px-2">
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <button onClick={gen} disabled={busy} className="btn-primary">
            {busy ? 'Generating…' : 'Generate token'}
          </button>
        )}
        <p className="text-xs text-ink-500 mt-2">
          The feed is currently <b>open</b> — no auth needed. Your token
          identifies your integration and will be required once metered limits
          launch. Send it as <code>?token=…</code> or an{' '}
          <code>Authorization: Bearer</code> header now so nothing breaks later.
        </p>
      </div>
    </section>
  )
}

function TeamPanel({ user, updateProfile }) {
  const seats = 5
  const list = user?.teamEmails || []
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const e = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return alert('Enter a valid email.')
    if (list.includes(e)) return setEmail('')
    if (list.length >= seats) return alert(`Agency includes ${seats} seats.`)
    setBusy(true)
    try {
      await updateProfile({ teamEmails: [...list, e] })
      setEmail('')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (e) => {
    setBusy(true)
    try {
      await updateProfile({ teamEmails: list.filter((x) => x !== e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-bold">
        Team seats{' '}
        <span className="text-ink-400 font-normal text-sm">
          {list.length} / {seats}
        </span>
      </h2>
      <div className="card p-4">
        <p className="text-xs text-ink-500 mb-3">
          Add your teammates' emails. They each register their own login, then we
          grant that email full Agency access — reply to your welcome email or
          message support with this list.
        </p>
        {list.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {list.map((e) => (
              <li
                key={e}
                className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5"
              >
                <span>{e}</span>
                <button
                  onClick={() => remove(e)}
                  disabled={busy}
                  className="text-xs text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {list.length < seats && (
          <div className="flex gap-2">
            <input
              className="field"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && add()}
            />
            <button onClick={add} disabled={busy} className="btn-primary shrink-0">
              Add
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function Sample({ label, code }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-ink-500">{label}</span>
        <Copy text={code} />
      </div>
      <pre className="p-4 text-xs overflow-x-auto font-mono leading-relaxed">{code}</pre>
    </div>
  )
}

function Copy({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        } catch {
          /* ignore */
        }
      }}
      className="text-xs text-brand-600 font-medium shrink-0"
    >
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  )
}
