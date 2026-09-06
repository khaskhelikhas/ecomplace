/**
 * Grant / revoke the admin custom claim on a Firebase Auth user.
 *
 *   node src/scripts/set-admin.js you@example.com          # grant
 *   node src/scripts/set-admin.js you@example.com --revoke # revoke
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.
 *
 * The claim is signed into the user's Firebase ID token by Google, so it
 * cannot be forged from the client. firestore.rules checks
 * `request.auth.token.admin == true`. After running this, the target user
 * must sign out and back in once for the new token to take effect.
 */
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function pickCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return cert(JSON.parse(raw));

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();

  // Fall back to a serviceAccount.json sitting in the project.
  const candidates = [
    join(__dirname, '..', '..', '..', '..', 'serviceAccount.json'), // repo root
    join(__dirname, '..', '..', '..', 'serviceAccount.json'),
    join(__dirname, '..', '..', 'serviceAccount.json'),
    join(process.cwd(), 'serviceAccount.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`Using ${p}`);
      return cert(JSON.parse(readFileSync(p, 'utf8')));
    }
  }
  throw new Error(
    'No credentials. Set GOOGLE_APPLICATION_CREDENTIALS, or put serviceAccount.json in the project root.'
  );
}

if (!getApps().length) {
  initializeApp({ credential: pickCredential() });
}

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');
if (!email) {
  console.error('Usage: node src/scripts/set-admin.js <email> [--revoke]');
  process.exit(1);
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims || {}) };
if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);
// force existing sessions to refresh their token
await auth.revokeRefreshTokens(user.uid);

console.log(`${revoke ? 'Revoked' : 'Granted'} admin for ${email} (${user.uid}).`);
console.log('They must sign out and back in for it to take effect.');
