# EcomPlace - Quick Start

## Requirements

- **Node.js 20+** (you have v24 - good)
- That's it. **No PostgreSQL, no database server.** The app uses a local
  SQLite file that is created automatically.

---

## First Time Setup

Run once from `D:\ecomplace`:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
.\setup.ps1
```

This installs backend + frontend dependencies.

---

## Start the App

From `D:\ecomplace`:

```powershell
.\start.ps1
```

This opens two PowerShell windows (backend + frontend) and your browser at
`http://localhost:5173`.

### Or start manually (two terminals)

Terminal 1 - Backend:
```powershell
cd D:\ecomplace\src\backend
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd D:\ecomplace\src\frontend
npm run dev
```

Then open **http://localhost:5173** and click **Register**.

---

## What Happens on Start

1. Backend starts on port **5000**, creates `src/backend/data/ecomplace.sqlite`
2. The scheduler runs immediately, then every **20 minutes**
3. With no API keys configured, it generates **40 realistic demo products**
   so the dashboard is populated
4. Frontend starts on port **5173** and proxies `/api/*` to the backend

---

## Ports

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173   |
| Backend  | http://localhost:5000   |
| Health   | http://localhost:5000/api/health |

---

## Using Real Product Data

The app runs on mock data until you add API keys. To use live data:

1. Copy `.env.example` to `.env` in `D:\ecomplace`
2. Fill in any of:
   - `KEEPA_API_KEY` - Amazon prices & best-seller ranks (https://keepa.com/api/)
   - `WALMART_API_KEY` - Walmart catalog (https://developer.walmart.com/)
   - `ALIEXPRESS_AFFILIATE_ID` - AliExpress hot products
3. Restart the backend

As soon as one real key is present, the mock fallback turns off.

---

## Reset the Database

Delete the SQLite file and restart the backend:

```powershell
Remove-Item D:\ecomplace\src\backend\data\ecomplace.sqlite* -Force
cd D:\ecomplace\src\backend
npm run dev
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/backend/src/server.js` | Express entry point |
| `src/backend/src/config/database.js` | SQLite setup + schema + pg-compatible wrapper |
| `src/backend/src/jobs/scheduler.js` | 20-minute fetch cycle |
| `src/backend/src/services/productFetcher.js` | Keepa / Walmart / AliExpress clients + margin math |
| `src/backend/src/services/mockData.js` | Demo product generator (used when no API keys) |
| `src/frontend/src/App.jsx` | React app + routes |
| `src/frontend/src/pages/` | Dashboard, ProductList, ProductDetail, Alerts, Login, Register |
| `src/frontend/public/sw.js` | Service Worker (offline mode) |

---

## Troubleshooting

**Port already in use** - `start.ps1` frees ports 5000/5173 automatically.
To do it manually:
```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Backend log** - printed in its PowerShell window. Errors also go to
`src/backend/logs/error.log`.

**"FOREIGN KEY constraint failed" on alerts** - your browser has a login
token from a deleted database. Log out and register again.

**Blank product images** - the demo uses `picsum.photos` placeholder URLs
which need internet. Real product data uses real image URLs.
