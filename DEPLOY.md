# Deploying EcomPlace (Firebase - all free)

The app is now **Firebase-native**. No separate backend server.

| Piece | Service | Cost |
|---|---|---|
| Web app | Firebase Hosting | free |
| Login / accounts | Firebase Authentication | free |
| Products / alerts / profiles | Cloud Firestore | free (Spark) |
| 20-minute product refresh | GitHub Actions cron -> Firestore | free |

Firebase project: **ecomplace-app**
Live URL: **https://ecomplace-app.web.app**

The old Express backend under `src/backend/src/{server.js,routes,config,jobs}`
is no longer used by the deployed app. Only `src/backend/src/services/mockData.js`
and `src/backend/src/scripts/refresh-firestore.js` matter now.

---

## Step 1 - Enable Firestore + Auth (Firebase Console, ~4 clicks)

**Firestore**
https://console.firebase.google.com/project/ecomplace-app/firestore
-> Create database -> **Production mode** -> location `nam5 (United States)` -> Enable

**Authentication**
https://console.firebase.google.com/project/ecomplace-app/authentication
-> Get started -> **Email/Password** -> enable the first toggle -> Save

---

## Step 2 - Deploy rules + hosting

```bash
cd D:\ecomplace
firebase deploy --only firestore:rules,hosting
```

After this, https://ecomplace-app.web.app can register and log in.
The product pages will be empty until Step 3 seeds data.

---

## Step 3 - Seed product data

### One-time: get a service account key

Firebase Console -> Project Settings (gear) -> **Service accounts** ->
**Generate new private key** -> save the JSON somewhere private,
e.g. `D:\ecomplace\serviceAccount.json` (already git-ignored).

### Run the refresh once locally

```powershell
cd D:\ecomplace\src\backend
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\ecomplace\serviceAccount.json"
npm run refresh:firestore
```

You should see `Upserted 40 products`. Refresh the site - products appear.

---

## Step 4 - Automate the 20-minute refresh (GitHub Actions)

1. Push this repo to GitHub (see below).
2. Repo -> **Settings** -> **Secrets and variables** -> **Actions** ->
   **New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: paste the **entire contents** of `serviceAccount.json`
3. The workflow `.github/workflows/refresh-products.yml` then runs every
   20 minutes automatically. Trigger it once manually from the **Actions**
   tab to test (`Refresh product data` -> Run workflow).

### Push to GitHub

```bash
cd D:\ecomplace
git remote add origin https://github.com/YOUR_USERNAME/ecomplace.git
git push -u origin main
```

---

## Updating later

| Change | Command |
|---|---|
| Frontend | `cd src/frontend && npm run build && cd ../.. && firebase deploy --only hosting` |
| Firestore rules | `firebase deploy --only firestore:rules` |
| Refresh logic | `git push` (GitHub Actions picks it up) |

---

## Real product data (optional)

Add repo secrets `KEEPA_API_KEY`, `WALMART_API_KEY`, `ALIEXPRESS_AFFILIATE_ID`
and extend `src/backend/src/scripts/refresh-firestore.js` to call those APIs
instead of `generateMockProducts`.
