import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';
import { startScheduler } from './jobs/scheduler.js';
import productRoutes from './routes/products.js';
import alertRoutes from './routes/alerts.js';
import authRoutes from './routes/auth.js';
import snapshotRoutes from './routes/snapshot.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// === Middleware ===
app.use(helmet());

// FRONTEND_URL may be a comma-separated list of allowed origins, e.g.
// "http://localhost:5173,https://ecomplace.web.app,https://ecomplace.firebaseapp.com"
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, mobile apps) with no Origin header
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/snapshot', snapshotRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === Error Handling ===
app.use((err, req, res, next) => {
  logger.error('Request error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// === Initialize Server ===
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Start scheduler
    await startScheduler();
    logger.info('Scheduler started');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
