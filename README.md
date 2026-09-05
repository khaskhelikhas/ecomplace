# EcomPlace - Deal Aggregator Portal

A hybrid (online + offline) software solution for distributors in North America to track best-selling products and deals from Amazon, Walmart, and AliExpress every 20 minutes.

## Features

- **Real-time Product Aggregation**: Fetches best-sellers and trending products every 20 minutes
- **Profit Calculator**: Automatically calculates margins based on FBA fees, shipping, and taxes
- **Offline Support**: PWA with offline caching using Service Workers
- **Price History**: Tracks price changes over time with visual charts
- **Alert System**: Email and push notifications for price drops
- **Multi-user SaaS**: Team accounts with role-based access
- **CSV Export**: Direct integration with inventory management systems
- **Multi-region**: Support for US and Canada marketplaces

## Tech Stack

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Database**: SQLite via the built-in `node:sqlite` module (zero-config,
  no server). A pg-compatible wrapper keeps route code portable to PostgreSQL.
- **Scheduler**: node-cron
- **APIs**: Keepa, Walmart IO, AliExpress Affiliate APIs (optional - falls back
  to a demo data generator when no keys are set)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand / Context API
- **PWA**: Service Workers + IndexedDB

## Project Structure

```
ecomplace/
├── src/
│   ├── backend/
│   │   ├── config/           # Database, API configs
│   │   ├── routes/           # Express route handlers
│   │   ├── controllers/      # Business logic
│   │   ├── services/         # API clients, fetchers
│   │   ├── models/           # Database models/schemas
│   │   ├── middleware/       # Auth, error handling
│   │   ├── jobs/             # Scheduled tasks
│   │   └── server.js         # Express app entry
│   └── frontend/
│       ├── components/       # React components
│       ├── pages/            # Page components
│       ├── hooks/            # Custom React hooks
│       ├── services/         # API client
│       ├── store/            # State management
│       ├── assets/           # Images, fonts
│       └── main.jsx          # Vite entry point
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── package.json              # Node dependencies
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm

No database server is required.

### Installation

```powershell
# From D:\ecomplace
.\setup.ps1
```

Or manually:
```bash
cd src/backend && npm install
cd ../frontend && npm install
```

`.env` is optional - see `.env.example`. The app runs on demo data with no
configuration.

### Start development servers

```powershell
# From D:\ecomplace - opens both servers + browser
.\start.ps1
```

Or manually in two terminals:
```bash
cd src/backend && npm run dev     # http://localhost:5000
cd src/frontend && npm run dev    # http://localhost:5173
```

## API Documentation

- `GET /api/products` - Get aggregated products
- `GET /api/products/best-sellers` - Get best-selling items
- `POST /api/alerts` - Create price alert
- `GET /api/snapshot` - Get latest product snapshot
- `POST /api/export/csv` - Export data as CSV

## Development Timeline

- **MVP (6-8 weeks)**: Core aggregation, dashboard, offline support
- **Phase 2 (3-4 weeks)**: Price history, alerts, exports
- **Phase 3 (4 weeks)**: Multi-user SaaS, Stripe billing

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature description"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact support@ecomplace.dev
