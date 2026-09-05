import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { productFetcher } from '../services/productFetcher.js';
import { generateMockProducts } from '../services/mockData.js';
import { getPool } from '../config/database.js';

const hasApiKeys = () =>
  Boolean(
    process.env.KEEPA_API_KEY ||
    process.env.WALMART_API_KEY ||
    process.env.ALIEXPRESS_AFFILIATE_ID
  );

let schedulerRunning = false;

export const startScheduler = async () => {
  try {
    logger.info('Starting product fetcher scheduler...');

    // Run every 20 minutes
    const interval = process.env.SCHEDULER_INTERVAL_MINUTES || 20;
    const cronExpression = `*/${interval} * * * *`; // Every N minutes

    cron.schedule(cronExpression, async () => {
      await fetchAndAggregateProducts();
    });

    // Run immediately on startup
    await fetchAndAggregateProducts();

    schedulerRunning = true;
    logger.info(`Scheduler started - runs every ${interval} minutes`);
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
    throw error;
  }
};

export const fetchAndAggregateProducts = async () => {
  const startTime = Date.now();

  try {
    logger.info('Starting product aggregation cycle...');

    // Fetch from all sources in parallel
    const [amazonProducts, walmartProducts, aliexpressProducts] = await Promise.all([
      productFetcher.fetchAmazonBestSellers(),
      productFetcher.fetchWalmartProducts(),
      productFetcher.fetchAliExpressProducts()
    ]);

    // Normalize and deduplicate
    let normalizedProducts = await productFetcher.normalizeProducts(
      amazonProducts,
      walmartProducts,
      aliexpressProducts
    );

    // Fall back to mock data when no real API keys are configured,
    // so the dashboard is always populated during development/demos.
    if (normalizedProducts.length === 0 && !hasApiKeys()) {
      logger.warn('No API keys configured - generating mock product data');
      normalizedProducts = generateMockProducts(40);
    }

    // Calculate margins
    const productsWithMargins = normalizedProducts.map(p =>
      productFetcher.calculateMargin(p)
    );

    // Store in database
    const stored = await productFetcher.storeProducts(productsWithMargins);

    // Create snapshot for offline mode
    await createSnapshot(productsWithMargins);

    // Check and trigger alerts
    await checkAndTriggerAlerts();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`Aggregation cycle completed in ${duration}s. Stored: ${stored} products`);

  } catch (error) {
    logger.error('Error in aggregation cycle:', error);
  }
};

const createSnapshot = async (products) => {
  const pool = getPool();

  try {
    // Keep only top 500 by margin
    const topProducts = products
      .sort((a, b) => (b.margin_percentage || 0) - (a.margin_percentage || 0))
      .slice(0, 500);

    const snapshotData = {
      products: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        source: p.source,
        price: p.current_price,
        margin: p.margin_percentage,
        rating: p.rating,
        image: p.image_url,
        url: p.source_url
      })),
      timestamp: new Date().toISOString(),
      totalCount: topProducts.length
    };

    await pool.query(
      'INSERT INTO snapshots (snapshot_data, product_count) VALUES ($1, $2)',
      [JSON.stringify(snapshotData), topProducts.length]
    );

    logger.info(`Snapshot created with ${topProducts.length} products`);
  } catch (error) {
    logger.error('Error creating snapshot:', error);
  }
};

const checkAndTriggerAlerts = async () => {
  const pool = getPool();

  try {
    // Find alerts that should be triggered
    const result = await pool.query(`
      SELECT a.id, a.user_id, a.target_price, a.target_margin, p.current_price, p.margin_percentage
      FROM alerts a
      JOIN products p ON a.product_id = p.id
      WHERE a.is_triggered = false
      AND (
        (a.target_price IS NOT NULL AND p.current_price <= a.target_price)
        OR (a.target_margin IS NOT NULL AND p.margin_percentage >= a.target_margin)
      )
    `);

    for (const alert of result.rows) {
      await pool.query(
        'UPDATE alerts SET is_triggered = true, triggered_at = NOW() WHERE id = $1',
        [alert.id]
      );

      logger.info(`Alert triggered: ${alert.id} for user ${alert.user_id}`);

      // Send notification (implement in separate service)
      // await notificationService.sendAlert(alert.user_id, alert);
    }

    logger.info(`Checked and triggered ${result.rows.length} alerts`);
  } catch (error) {
    logger.error('Error checking alerts:', error);
  }
};

export const isSchedulerRunning = () => schedulerRunning;
