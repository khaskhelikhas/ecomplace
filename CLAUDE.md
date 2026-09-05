# EcomPlace - Development Guide

## Project Overview

EcomPlace is a hybrid (online + offline) deal aggregator portal for distributors in North America. It aggregates best-selling products and deals from Amazon, Walmart, and AliExpress every 20 minutes.

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: SQLite via built-in `node:sqlite` (file at `src/backend/data/ecomplace.sqlite`).
  `config/database.js` exposes a `getPool().query(sql, params)` wrapper that
  accepts `$1`-style placeholders and returns `{ rows }`, so route code stays
  PostgreSQL-compatible.
- **Scheduler**: node-cron (20-minute cycle)
- **Authentication**: JWT
- **Data source**: real APIs when keys are set, otherwise `services/mockData.js`

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **PWA**: Service Workers + IndexedDB

## Project Structure

```
ecomplace/
├── src/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.js           # Express app entry point
│   │   │   ├── config/
│   │   │   │   └── database.js     # PostgreSQL connection & initialization
│   │   │   ├── routes/
│   │   │   │   ├── auth.js         # Login, register, profile
│   │   │   │   ├── products.js     # Get products, filters, export
│   │   │   │   ├── alerts.js       # Price alerts CRUD
│   │   │   │   └── snapshot.js     # Offline mode snapshots
│   │   │   ├── services/
│   │   │   │   └── productFetcher.js  # Keepa, Walmart, AliExpress APIs
│   │   │   ├── jobs/
│   │   │   │   └── scheduler.js    # 20-minute cron job
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   │       └── logger.js       # Winston logging
│   │   ├── logs/                   # Log files (git ignored)
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.jsx            # Vite entry point
│       │   ├── App.jsx             # Main app component
│       │   ├── pages/
│       │   │   ├── Dashboard.jsx   # Stats & overview
│       │   │   ├── ProductList.jsx # Products with filters
│       │   │   ├── ProductDetail.jsx # Single product
│       │   │   ├── Alerts.jsx      # User's alerts
│       │   │   ├── Login.jsx       # Auth
│       │   │   └── Register.jsx    # Auth
│       │   ├── components/
│       │   │   └── Navbar.jsx      # Navigation
│       │   ├── store/
│       │   │   └── authStore.js    # Zustand auth state
│       │   ├── index.css           # Tailwind imports
│       │   └── App.css
│       ├── public/
│       │   ├── sw.js               # Service Worker
│       │   └── manifest.json       # PWA manifest
│       ├── index.html              # Entry HTML
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── package.json
│
├── .env.example                    # Environment template
├── .gitignore
├── package.json                    # Root package.json (workspaces)
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Install Dependencies

```bash
# Root level (for concurrently)
npm install

# Backend
cd src/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- Database credentials
- API keys (Keepa, Walmart, AliExpress)
- JWT secret
- Email/Stripe configuration

### 3. Create Database

```bash
psql -U postgres
CREATE DATABASE ecomplace;
\q
```

Tables will auto-create on first server start (see `src/backend/src/config/database.js`).

### 4. Run Development Servers

```bash
# From root directory
npm run dev

# Or separately:
# Terminal 1: Backend
cd src/backend
npm run dev

# Terminal 2: Frontend
cd src/frontend
npm run dev
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:5173`

## Key Features Implementation

### 1. Product Fetching (Every 20 Minutes)

Located in: `src/backend/src/services/productFetcher.js` & `src/backend/src/jobs/scheduler.js`

- Calls Keepa API for Amazon best-sellers
- Calls Walmart IO API for trending products
- Calls AliExpress Affiliate API for hot products
- Normalizes data format
- Deduplicates across sources
- Calculates profit margins
- Stores in PostgreSQL
- Creates snapshot for offline mode

### 2. Offline Mode (PWA)

- Service Worker: `src/frontend/public/sw.js`
- Caches latest snapshot in IndexedDB
- Displays cached data when offline
- Auto-syncs when connection returns

### 3. Profit Calculation

Formula in `productFetcher.js::calculateMargin()`:
```
retail_price = source_price * 1.5  // 50% markup
total_cost = source_price + fba_fee + shipping_cost + tax
margin% = ((retail_price - total_cost) / retail_price) * 100
```

### 4. Price Alerts

- User sets target price or margin %
- Scheduler checks alerts every 20 minutes
- Triggers when condition met
- Sends email/push notification (TODO: integrate service)

### 5. Authentication

- JWT tokens with 7-day expiry
- Passwords hashed with bcrypt
- Stored in localStorage (frontend)
- Auth middleware TBD

### 6. CSV Export

Endpoint: `GET /api/products/export/csv`
Exports filtered products as CSV for inventory systems.

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires JWT)

### Products
- `GET /api/products` - Get all products (filters: search, source, minPrice, maxPrice, minMargin, maxMargin)
- `GET /api/products/best-sellers` - Get best-selling items
- `GET /api/products/:id` - Get product details + price history
- `GET /api/products/export/csv` - Export as CSV

### Alerts
- `GET /api/alerts?userId=X` - Get user's alerts
- `POST /api/alerts` - Create new alert
- `DELETE /api/alerts/:id` - Delete alert

### Snapshot (Offline)
- `GET /api/snapshot` - Get latest product snapshot
- `GET /api/snapshot/history` - Get snapshot history

## Database Schema

### users
```sql
id (UUID PK), email, password_hash, full_name, role, subscription_plan, 
is_active, created_at, updated_at
```

### products
```sql
id (UUID PK), asin, sku, name, category, source, source_url, current_price,
previous_price, price_change, rating, reviews_count, best_sellers_rank,
fba_fee, margin_percentage, shipping_cost, image_url, is_active, 
fetched_at, created_at, updated_at
```

### price_history
```sql
id (UUID PK), product_id (FK), price, recorded_at
```

### alerts
```sql
id (UUID PK), user_id (FK), product_id (FK), alert_type, target_price,
target_margin, is_triggered, triggered_at, notification_sent, created_at
```

### snapshots
```sql
id (UUID PK), snapshot_data (JSONB), product_count, created_at
```

## Common Development Tasks

### Add a New Product Filter

1. Add parameter to `src/backend/src/routes/products.js` GET `/products`
2. Add SQL WHERE clause
3. Add input field in `src/frontend/src/pages/ProductList.jsx`

### Add a New API Endpoint

1. Create route file in `src/backend/src/routes/`
2. Import in `src/backend/src/server.js`
3. Add route: `app.use('/api/route', routeFile)`

### Update Database Schema

1. Modify query in `src/backend/src/config/database.js::initializeTables()`
2. Restart backend server
3. Schema auto-updates

### Customize Profit Calculation

Edit `src/backend/src/services/productFetcher.js::calculateMargin()`

### Change Scheduler Interval

Set `SCHEDULER_INTERVAL_MINUTES` in `.env` (default 20)

## Deployment Checklist

### Backend
- [ ] Set production environment variables
- [ ] Use PostgreSQL managed service (AWS RDS, DigitalOcean, etc.)
- [ ] Setup Redis if using caching
- [ ] Configure SMTP for email alerts
- [ ] Use Stripe for billing
- [ ] Deploy to: DigitalOcean App Platform, Heroku, AWS, or self-hosted VPS

### Frontend
- [ ] Build: `npm run build`
- [ ] Deploy to: Cloudflare Pages, Vercel, Netlify, or serve from backend

### Environment
- [ ] Use environment-specific `.env` files
- [ ] Store secrets in CI/CD secrets manager
- [ ] Setup CORS correctly
- [ ] Enable HTTPS everywhere
- [ ] Setup backup strategy for database

## Debugging

### Backend Logs
```bash
tail -f src/backend/logs/all.log
tail -f src/backend/logs/error.log
```

### Check Scheduler Running
Visit: `http://localhost:5000/api/health`

### Test Product Fetcher
- Manually: `npm run seed` (TODO: implement)
- Via endpoint: POST `/api/scheduler/run` (TODO: add admin endpoint)

### Database Queries
```bash
psql -U postgres -d ecomplace
SELECT * FROM products LIMIT 5;
SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1;
```

## Next Steps (Phase 2 & 3)

### Phase 2 - Enhance Features
- [ ] Price history charts (Chart.js integration)
- [ ] Email/push notifications (Node Mailer / Firebase)
- [ ] Advanced filters (category, rating range, etc.)
- [ ] Product comparison tool
- [ ] Saved product lists
- [ ] Admin dashboard

### Phase 3 - SaaS Features
- [ ] Multi-user teams
- [ ] Role-based access control
- [ ] Stripe subscription billing
- [ ] Usage analytics
- [ ] API access for third parties
- [ ] Mobile app (React Native)

## Support & Questions

For implementation details, refer to:
- Backend service: `src/backend/src/services/productFetcher.js`
- Scheduler logic: `src/backend/src/jobs/scheduler.js`
- Frontend data fetching: `src/frontend/src/pages/ProductList.jsx`
- Database queries: `src/backend/src/routes/products.js`

## License

PROPRIETARY - All rights reserved
