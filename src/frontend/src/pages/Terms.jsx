import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        EcomPlace ("the Service") aggregates publicly available deal listings and
        provides heuristic buying signals and profit estimates. By using the
        Service you agree to these terms.
      </p>
      <h3>1. No warranty</h3>
      <p>
        Prices, discounts, availability, "buy / watch / skip" signals, drop-chance
        percentages and profit estimates are provided <b>as is</b>, are derived
        from third-party feeds and simple heuristics, and may be inaccurate or
        out of date. Always confirm the price and terms on the retailer's site
        before purchasing. Nothing here is financial, investment or tax advice.
      </p>
      <h3>2. Affiliate links</h3>
      <p>
        Some outbound links are affiliate links. EcomPlace (or, where you have
        set your own affiliate ids, you) may earn a commission on qualifying
        purchases at no extra cost to the buyer.
      </p>
      <h3>3. Your account</h3>
      <p>
        You are responsible for activity under your account and for keeping your
        password secure. You may delete your data at any time by contacting us.
      </p>
      <h3>4. Acceptable use</h3>
      <p>
        Do not scrape, resell or redistribute the Service's data in bulk, attempt
        to disrupt it, or use it for unlawful purposes.
      </p>
      <h3>5. Changes</h3>
      <p>
        We may update these terms; continued use after a change means you accept
        it.
      </p>
      <p className="text-ink-400 text-sm mt-8">
        Last updated {new Date().toISOString().slice(0, 10)}.
      </p>
    </LegalShell>
  )
}

export function LegalShell({ title, children }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/" className="text-sm text-brand-600">← Home</Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">{title}</h1>
      <div className="prose-sm space-y-3 text-ink-700 [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:text-ink-900">
        {children}
      </div>
    </div>
  )
}
