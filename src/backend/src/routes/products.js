import express from 'express';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      category,
      source,
      minPrice,
      maxPrice,
      minMargin,
      maxMargin,
      sortBy = 'margin_percentage',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    const pool = getPool();
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];
    let paramCount = 1;

    // Build dynamic query
    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (source) {
      query += ` AND source = $${paramCount}`;
      params.push(source);
      paramCount++;
    }

    if (minPrice) {
      query += ` AND current_price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
      paramCount++;
    }

    if (maxPrice) {
      query += ` AND current_price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
      paramCount++;
    }

    if (minMargin) {
      query += ` AND margin_percentage >= $${paramCount}`;
      params.push(parseFloat(minMargin));
      paramCount++;
    }

    if (maxMargin) {
      query += ` AND margin_percentage <= $${paramCount}`;
      params.push(parseFloat(maxMargin));
      paramCount++;
    }

    // Order and limit
    const validSortColumns = ['margin_percentage', 'current_price', 'rating', 'best_sellers_rank'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'margin_percentage';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    query += ` ORDER BY ${sortColumn} ${validSortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) AS count FROM products WHERE is_active = 1',
      []
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    next(error);
  }
});

/**
 * GET /api/products/best-sellers
 * Get best-selling products
 */
router.get('/best-sellers', async (req, res, next) => {
  try {
    const pool = getPool();
    const { limit = 20, region = 'US' } = req.query;

    const result = await pool.query(
      `SELECT * FROM products
       WHERE is_active = true AND best_sellers_rank IS NOT NULL
       ORDER BY best_sellers_rank ASC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching best-sellers:', error);
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Get single product details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get product
    const productResult = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get price history
    const historyResult = await pool.query(
      `SELECT price, recorded_at FROM price_history
       WHERE product_id = $1
       ORDER BY recorded_at DESC
       LIMIT 30`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...productResult.rows[0],
        priceHistory: historyResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching product details:', error);
    next(error);
  }
});

/**
 * GET /api/products/export/csv
 * Export products as CSV
 */
router.get('/export/csv', async (req, res, next) => {
  try {
    const pool = getPool();
    const { category, source } = req.query;

    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];

    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    if (source) {
      query += ` AND source = $2`;
      params.push(source);
    }

    const result = await pool.query(query, params);

    // Convert to CSV
    const headers = ['ID', 'Name', 'Source', 'Price', 'Margin %', 'Rating', 'URL'];
    const rows = result.rows.map(p => [
      p.id,
      p.name,
      p.source,
      p.current_price,
      p.margin_percentage,
      p.rating,
      p.source_url
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting CSV:', error);
    next(error);
  }
});

export default router;
