import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function Settings() {
  const { user, updateProfile } = useAuthStore()
  const [f, setF] = useState({
    fullName: user?.fullName || '',
    affiliateAmazonTag: user?.affiliateAmazonTag || '',
    affiliateEbayCampaign: user?.affiliateEbayCampaign || '',
    affiliateGenericQs: user?.affiliateGenericQs || '',
    defaultFeePct: user?.defaultFeePct ?? 15,
    defaultShipping: user?.defaultShipping ?? 0,
  })
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const ch = (e) => setF({ ...f, [e.target.name]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await updateProfile({
        fullName: f.fullName.trim(),
        affiliateAmazonTag: f.affiliateAmazonTag.trim(),
        affiliateEbayCampaign: f.affiliateEbayCampaign.trim(),
        affiliateGenericQs: f.affiliateGenericQs.trim(),
        defaultFeePct: Number(f.defaultFeePct) || 0,
        defaultShipping: Number(f.defaultShipping) || 0,
      })
      setMsg({ t: 'ok', m: 'Saved.' })
    } catch {
      setMsg({ t: 'err', m: 'Could not save.' })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-ink-500 text-sm mb-6">
        Your affiliate ids and default costs power the profit calculator and let
        you earn commission on deals you open or share.
      </p>

      {msg && (
        <div
          className={`text-sm px-4 py-3 rounded-lg mb-4 ${
            msg.t === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {msg.m}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="font-bold">Profile</h2>
          <div>
            <label className="label">Full name</label>
            <input className="field" name="fullName" value={f.fullName} onChange={ch} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field bg-slate-50" value={user?.email} disabled />
          </div>
        </section>

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="font-bold">Your affiliate ids</h2>
          <p className="text-xs text-ink-500 -mt-2">
            When set, “View deal” links use YOUR tags, so purchases through them pay
            YOU. Leave blank to use plain links.
          </p>
          <div>
            <label className="label">Amazon Associates tag</label>
            <input
              className="field"
              name="affiliateAmazonTag"
              value={f.affiliateAmazonTag}
              onChange={ch}
              placeholder="yourname-20"
            />
          </div>
          <div>
            <label className="label">eBay Partner Network campaign id</label>
            <input
              className="field"
              name="affiliateEbayCampaign"
              value={f.affiliateEbayCampaign}
              onChange={ch}
              placeholder="5339000000"
            />
          </div>
          <div>
            <label className="label">Other retailers — query string</label>
            <input
              className="field"
              name="affiliateGenericQs"
              value={f.affiliateGenericQs}
              onChange={ch}
              placeholder="ref=yourid&utm_source=you"
            />
          </div>
        </section>

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="font-bold">Default resale costs</h2>
          <p className="text-xs text-ink-500 -mt-2">
            Pre-fills the profit calculator on every deal.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Marketplace fee %</label>
              <input
                className="field"
                type="number"
                name="defaultFeePct"
                value={f.defaultFeePct}
                onChange={ch}
              />
            </div>
            <div>
              <label className="label">Shipping per unit ($)</label>
              <input
                className="field"
                type="number"
                step="0.01"
                name="defaultShipping"
                value={f.defaultShipping}
                onChange={ch}
              />
            </div>
          </div>
        </section>

        <button className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
