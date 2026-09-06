import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function VerifyBanner() {
  const { user, resendVerification } = useAuthStore()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!user || user.emailVerified) return null

  const resend = async () => {
    setBusy(true)
    try {
      await resendVerification()
      setSent(true)
    } catch {
      /* ignore */
    }
    setBusy(false)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          📧 Verify your email to receive price-alert notifications.
        </span>
        {sent ? (
          <span className="font-medium">Verification email sent.</span>
        ) : (
          <button onClick={resend} disabled={busy} className="font-semibold underline">
            {busy ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  )
}
