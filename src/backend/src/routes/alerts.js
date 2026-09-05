import express from 'express';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/alerts
 * Get all alerts for user
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query; // Should come from auth middleware

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT a.*, p.name, p.current_price, p.margin_percentage
       FROM alerts a
       JOIN products p ON a.product_id = p.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    next(error);
  }
});

/**
 * POST /api/alerts
 * Create new alert
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId, productId, alertType, targetPrice, targetMargin } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: 'userId and productId required' });
    }

    const pool = getPool();

    const result = await pool.query(
      `INSERT INTO alerts (user_id, product_id, alert_type, target_price, target_margin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, productId, alertType || 'price', targetPrice || null, targetMargin || null]
    );

    logger.info(`Alert created: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating alert:', error);
    next(error);
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);

    logger.info(`Alert deleted: ${id}`);

    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    logger.error('Error deleting alert:', error);
    next(error);
  }
});

export default router;
