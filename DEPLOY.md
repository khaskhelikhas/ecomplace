# Deploying EcomPlace

Two parts deploy separately:

| Part | What | Where | Status |
|---|---|---|---|
| **Frontend** | React build | Firebase Hosting | ✅ **LIVE:** https://ecomplace-app.web.app |
| **Backend** | Node/Express + SQLite | Render.com | ⏳ you deploy this next |

Login/register on the live site will fail until the backend is deployed and
the frontend is rebuilt pointing at it.

---

## Step 1 - Push this repo to GitHub

The git repo is already initialised and committed locally. You just need a
GitHub repo to push to.

1. Create an **empty** repo at https://github.com/new
   - Name: `ecomplace`
   - Do **not** add a README, .gitignore, or license
2. Push (replace `YOUR_USERNAME`):
   ```bash
   cd D:\ecomplace
   git remote add origin https://github.com/YOUR_USERNAME/ecomplace.git
   git push -u origin main
   ```

---

## Step 2 - Deploy the backend on Render

1. Go to https://render.com and sign up (use **Sign in with GitHub**).
2. **New** -> **Blueprint**.
3. Pick your `ecomplace` repo. Render reads `render.yaml` automatically and
   shows a service called **ecomplace-api**.
4. Click **Apply**. Wait ~3-5 minutes for the first build.
5. Open the service URL it gives you, e.g.
   `https://ecomplace-api.onrender.com/api/health`
   You should see `{"status":"ok",...}`.

### Important: free-tier data note

Render's free plan has **no persistent disk**. The SQLite file lives only
while the service is awake. The free service **sleeps after 15 minutes of
inactivity**, and on the next wake the database starts empty - so registered
accounts and alerts are lost.

That is fine for a demo. For real use, pick one:

- **Render Starter ($7/mo)** - uncomment the `disk:` block is already in
  `render.yaml`; just upgrade the instance type in the dashboard.
- **Render free PostgreSQL** - create one in Render, then tell me and I will
  switch the backend to use `DATABASE_URL` (keeps SQLite for local dev).
- **Fly.io** - free tier includes a 3 GB persistent volume.

---

## Step 3 - Point the frontend at the backend

1. Edit `src/frontend/.env.production`:
   ```
   VITE_API_URL=https://ecomplace-api.onrender.com
   ```
   (your real Render URL, no trailing slash)

2. Rebuild and redeploy:
   ```bash
   cd D:\ecomplace\src\frontend
   npm run build
   cd ..\..
   firebase deploy --only hosting
   ```

3. Open https://ecomplace-app.web.app -> **Register** -> it works.

---

## Step 4 - Confirm CORS

`render.yaml` already sets:
```
FRONTEND_URL=https://ecomplace-app.web.app,https://ecomplace-app.firebaseapp.com
```
If you later add a custom domain, add it to that list in the Render
dashboard (Environment tab) and the service will redeploy.

---

## Updating later

| Change | Command |
|---|---|
| Frontend | `cd src/frontend && npm run build && cd ../.. && firebase deploy --only hosting` |
| Backend | `git push` - Render auto-redeploys |

---

## Firebase project

- Project ID: `ecomplace-app`
- Console: https://console.firebase.google.com/project/ecomplace-app
- Hosting URL: https://ecomplace-app.web.app
