import { LegalShell } from './Terms'

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>We keep data collection minimal.</p>
      <h3>What we store</h3>
      <p>
        Your email and display name (via Firebase Authentication); your price
        alerts, sourcing list and settings (in Firebase Firestore); and anonymous
        usage events such as page views and "deal clicked" (via Firebase
        Analytics / Google Analytics).
      </p>
      <h3>What we do not do</h3>
      <p>
        We do not sell your data. We do not share your personal information with
        advertisers. Affiliate networks only receive the standard referral
        parameters in an outbound link when you click through to a retailer.
      </p>
      <h3>Cookies</h3>
      <p>
        Firebase Authentication and Analytics set cookies / local storage needed
        to keep you signed in and to measure aggregate traffic.
      </p>
      <h3>Your choices</h3>
      <p>
        You can reset your password, edit or delete your alerts and sourcing
        items in-app, and request full account deletion by contacting us.
      </p>
      <p className="text-ink-400 text-sm mt-8">
        Last updated {new Date().toISOString().slice(0, 10)}.
      </p>
    </LegalShell>
  )
}
