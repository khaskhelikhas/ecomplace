const YEAR = new Date().getFullYear()

/**
 * Shared footer for every page (logged in or out).
 */
export default function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-4 py-10 text-center text-xs text-ink-400 border-t border-slate-200 mt-8">
      <p>
        Deal data from public feeds (DealNews · Slickdeals). Outbound links may
        earn a commission at no cost to you. Signals are heuristic estimates,
        not financial advice.
      </p>
      <p className="mt-2">
        <a href="/deals" className="hover:underline">Public deals</a> ·{' '}
        <a href="/terms" className="hover:underline">Terms</a> ·{' '}
        <a href="/privacy" className="hover:underline">Privacy</a>
      </p>
      <p className="mt-3 text-ink-500">
        © {YEAR} EcomPlace · Developed by <b>Safdar Khaskheli</b> ·{' '}
        <a
          href="https://wa.me/923132565013"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          WhatsApp +92 313 2565013
        </a>
      </p>
    </footer>
  )
}
