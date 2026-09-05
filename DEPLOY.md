# Deploying EcomPlace

The app has two parts that deploy separately:

| Part | What it is | Where it goes |
|---|---|---|
| **Frontend** | Static React build (`dist/`) | **Firebase Hosting** |
| **Backend** | Node/Express API + SQLite | **Render / Railway / Fly.io / VPS** |

> Firebase Hosting only serves static files. It cannot run the Express
> server, so the backend must be hosted elsewhere. Firebase Functions is an
> option but needs the paid Blaze plan and a rewrite away from SQLite, so it
> is not covered here.

---

## Part 1 - Deploy the Backend (do this first)

You need the backend URL before building the frontend.

### Option A - Render.com (free, keeps SQLite)

1. Push this repo to GitHub.
2. Go to https://render.com -> **New** -> **Web Service** -> connect the repo.
3. Settings:
   - **Root Directory**: `src/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add a **Disk** (so the SQLite file survives restarts):
   - Mount path: `/data`
   - Size: 1 GB
5. Add environment variables:
   ```
   NODE_ENV=production
   DB_FILE=/data/ecomplace.sqlite
   JWT_SECRET=<a long random string>
   FRONTEND_URL=https://YOUR-PROJECT.web.app,https://YOUR-PROJECT.firebaseapp.com
   ```
   (add KEEPA_API_KEY etc. later for real data)
6. Deploy. Note the URL, e.g. `https://ecomplace-api.onrender.com`.
7. Test: open `https://ecomplace-api.onrender.com/api/health` -> `{"status":"ok"}`

> Free Render services sleep after 15 min idle; the first request then takes
> ~30 s to wake. Fine for testing, upgrade for production.

### Option B - Railway.app

Same idea: new project from repo, root `src/backend`, start `npm start`,
add a volume mounted where `DB_FILE` points, set the same env vars.

---

## Part 2 - Deploy the Frontend to Firebase Hosting

### One-time setup

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in (opens a browser):
   ```bash
   firebase login
   ```
3. Create a project at https://console.firebase.google.com (or use an
   existing one). Copy its **Project ID**.
4. Put the Project ID in `.firebaserc` (replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`).

### Point the frontend at your backend

Edit `src/frontend/.env.production`:
```
VITE_API_URL=https://ecomplace-api.onrender.com
```
(no trailing slash, use your real backend URL)

### Build and deploy

From `D:\ecomplace`:
```bash
cd src/frontend
npm run build
cd ../..
firebase deploy --only hosting
```

Firebase prints your live URL, e.g. `https://your-project.web.app`.

### After first deploy

Make sure the backend's `FRONTEND_URL` env var includes that exact URL
(both `.web.app` and `.firebaseapp.com`), then redeploy/restart the backend
so CORS accepts it.

---

## Checklist

- [ ] Backend deployed, `/api/health` returns ok
- [ ] Backend `FRONTEND_URL` contains the Firebase URLs
- [ ] Backend `JWT_SECRET` set to a real secret
- [ ] `src/frontend/.env.production` has `VITE_API_URL` = backend URL
- [ ] `npm run build` in `src/frontend`
- [ ] `.firebaserc` has your project ID
- [ ] `firebase deploy --only hosting`
- [ ] Open the Firebase URL, register, log in

---

## Updating later

**Frontend change:**
```bash
cd src/frontend && npm run build && cd ../.. && firebase deploy --only hosting
```

**Backend change:** push to GitHub - Render/Railway auto-redeploys.

---

## Custom domain (optional)

Firebase Console -> Hosting -> Add custom domain -> follow DNS steps.
Then add the custom domain to the backend `FRONTEND_URL` list too.
