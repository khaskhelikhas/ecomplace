import express from 'express';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/snapshot
 * Get latest product snapshot for offline mode
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();

    // Get latest snapshot
    const result = await pool.query(
      `SELECT id, snapshot_data, product_count, created_at
       FROM snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          timestamp: new Date().toISOString(),
          totalCount: 0
        }
      });
    }

    const raw = result.rows[0].snapshot_data;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    res.json({
      success: true,
      data: parsed,
      meta: {
        snapshotId: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        productCount: result.rows[0].product_count
      }
    });
  } catch (error) {
    logger.error('Error fetching snapshot:', error);
    next(error);
  }
});

/**
 * GET /api/snapshot/history
 * Get snapshot history
 */
router.get('/history', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, product_count, created_at
       FROM snapshots
       ORDER BY created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching snapshot history:', error);
    next(error);
  }
});

export default router;
