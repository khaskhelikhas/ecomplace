import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import SignalBadge from '../components/SignalBadge'

export default function Landing() {
  const [teasers, setTeasers] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getDoc(doc(db, 'snapshots', 'latest'))
        if (s.exists()) {
          const rows = (s.data().products || [])
            .filter((p) => p.imageUrl)
            .sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0))
            .slice(0, 6)
          setTeasers(rows)
        }
      } catch {
        /* fine, hero still works */
      }
    })()
  }, [])

  return (
    <div>
      {/* top bar */}
      <div className="bg-brand-600 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-extrabold text-lg flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/15">🛍️</span>
            EcomPlace
          </span>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm rounded-lg hover:bg-white/10">
              Sign in
            </Link>
            <Link to="/register" className="px-3 py-2 text-sm rounded-lg bg-white text-brand-700 font-semibold">
              Get started free
            </Link>
          </div>
        </div>
      </div>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">
          Real deals. Smart buy signals.
        </h1>
        <p className="text-ink-500 mt-4 max-w-2xl mx-auto text-lg">
          Live prices from Amazon, Walmart, eBay, Best Buy, Home Depot and more —
          refreshed every 20 minutes, each scored <b>buy</b> / <b>watch</b> / <b>skip</b>,
          with a built-in flip-profit calculator.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/register" className="btn-primary">Start free →</Link>
          <Link to="/login" className="btn-ghost">I have an account</Link>
        </div>
        <p className="text-xs text-ink-400 mt-3">Free forever · no card required</p>
      </section>

      {/* teaser deals */}
      {teasers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-sm font-semibold text-ink-500 mb-4 text-center uppercase tracking-wide">
            A few live right now
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teasers.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="relative -mx-4 -mt-4 mb-3 h-40 bg-slate-50 rounded-t-xl overflow-hidden">
                  <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-3" />
                  <span className="absolute top-2 right-2">
                    <SignalBadge rec={p.recommendation} />
                  </span>
                </div>
                <p className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold">${p.currentPrice}</span>
                  {p.marginPercentage > 0 && (
                    <span className="chip bg-emerald-100 text-emerald-700">−{p.marginPercentage}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/register" className="btn-primary">See all deals →</Link>
          </div>
        </section>
      )}

      {/* how */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-8 text-center">
          {[
            ['🔄', 'Auto-refreshed', 'Deals pulled from public feeds every 20 minutes.'],
            ['🎯', 'Buy signals', 'Discount depth, price trend and expiry → a clear call.'],
            ['🧮', 'Profit built in', 'Sell price, fees, shipping → profit, ROI, break-even.'],
          ].map(([icon, t, d]) => (
            <div key={t}>
              <div className="text-3xl">{icon}</div>
              <h3 className="font-bold mt-2">{t}</h3>
              <p className="text-sm text-ink-500 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} EcomPlace · Deal data from DealNews & Slickdeals ·
        outbound links may earn a commission ·{' '}
        <Link to="/terms" className="hover:underline">Terms</Link> ·{' '}
        <Link to="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  )
}
