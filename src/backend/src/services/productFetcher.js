import axios from 'axios';
import { logger } from '../utils/logger.js';
import { getPool } from '../config/database.js';

class ProductFetcher {
  constructor() {
    this.keepaKey = process.env.KEEPA_API_KEY;
    this.walmartKey = process.env.WALMART_API_KEY;
    this.aliexpressId = process.env.ALIEXPRESS_AFFILIATE_ID;
  }

  /**
   * Fetch best-sellers from Keepa API (Amazon)
   */
  async fetchAmazonBestSellers() {
    try {
      logger.info('Fetching Amazon best-sellers from Keepa...');

      if (!this.keepaKey) {
        logger.warn('Keepa API key not configured');
        return [];
      }

      // Keepa API endpoint for best sellers
      const response = await axios.get('https://api.keepa.com/bestsellers', {
        params: {
          key: this.keepaKey,
          domain: 'AMAZON_US', // US marketplace
          category: 0,
          limit: 100
        },
        timeout: 10000
      });

      const products = response.data.bestSellers || [];
      logger.info(`Found ${products.length} Amazon best-sellers`);

      return products.map(p => ({
        asin: p.asin,
        name: p.title || 'Unknown',
        source: 'amazon-us',
        source_url: `https://amazon.com/dp/${p.asin}`,
        best_sellers_rank: p.rank,
        rating: p.rating || 0,
        reviews_count: p.reviews || 0,
        image_url: p.imageUrl || null
      }));
    } catch (error) {
      logger.error('Error fetching Amazon best-sellers:', error.message);
      return [];
    }
  }

  /**
   * Fetch products from Walmart API
   */
  async fetchWalmartProducts() {
    try {
      logger.info('Fetching Walmart products...');

      if (!this.walmartKey) {
        logger.warn('Walmart API key not configured');
        return [];
      }

      const response = await axios.get('https://api.walmart.io/v1/Feed', {
        headers: {
          'WM_SEC.ACCESS_TOKEN': this.walmartKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const products = response.data.items || [];
      logger.info(`Found ${products.length} Walmart products`);

      return products.slice(0, 100).map(p => ({
        sku: p.sku,
        name: p.productName || 'Unknown',
        source: 'walmart-us',
        source_url: p.productUrl || '',
        current_price: p.currentPrice,
        rating: p.averageRating || 0,
        image_url: p.imageUrl || null
      }));
    } catch (error) {
      logger.error('Error fetching Walmart products:', error.message);
      return [];
    }
  }

  /**
   * Fetch hot products from AliExpress Affiliate API
   */
  async fetchAliExpressProducts() {
    try {
      logger.info('Fetching AliExpress hot products...');

      if (!this.aliexpressId) {
        logger.warn('AliExpress Affiliate ID not configured');
        return [];
      }

      // Simulated endpoint - actual implementation depends on API access
      const response = await axios.get('https://api.aliexpress.com/v1/affiliate/hotproducts', {
        params: {
          affiliateId: this.aliexpressId,
          fields: 'productId,productTitle,productImg,originalPrice,salePrice',
          limit: 100
        },
        timeout: 10000
      });

      const products = response.data.products || [];
      logger.info(`Found ${products.length} AliExpress products`);

      return products.map(p => ({
        name: p.productTitle,
        source: 'aliexpress',
        source_url: p.productUrl || '',
        current_price: p.salePrice,
        previous_price: p.originalPrice,
        image_url: p.productImg,
        category: 'General'
      }));
    } catch (error) {
      logger.error('Error fetching AliExpress products:', error.message);
      return [];
    }
  }

  /**
   * Normalize and deduplicate products
   */
  async normalizeProducts(amazonProducts, walmartProducts, aliexpressProducts) {
    try {
      logger.info('Normalizing and deduplicating products...');

      const allProducts = [
        ...amazonProducts.map(p => ({ ...p, region: 'US' })),
        ...walmartProducts.map(p => ({ ...p, region: 'US' })),
        ...aliexpressProducts.map(p => ({ ...p, region: 'INTL' }))
      ];

      // Simple deduplication by name (can be improved)
      const seen = new Map();
      const unique = [];

      for (const product of allProducts) {
        const key = product.name?.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, true);
          unique.push(product);
        }
      }

      logger.info(`Normalized to ${unique.length} unique products`);
      return unique;
    } catch (error) {
      logger.error('Error normalizing products:', error.message);
      return [];
    }
  }

  /**
   * Calculate profit margin for a product
   */
  calculateMargin(productData) {
    try {
      const sourcePrice = productData.current_price || 0;
      const fbaFee = productData.fba_fee || 0;
      const shippingCost = productData.shipping_cost || 0;
      const tax = sourcePrice * 0.1; // Estimate 10% tax

      const totalCost = sourcePrice + fbaFee + shippingCost + tax;
      const retailPrice = sourcePrice * 1.5; // Estimate 50% markup (can be dynamic)

      const margin = ((retailPrice - totalCost) / retailPrice) * 100;

      return {
        ...productData,
        fba_fee: Number(fbaFee.toFixed(2)),
        shipping_cost: Number(shippingCost.toFixed(2)),
        margin_percentage: Number(Math.max(0, margin).toFixed(2))
      };
    } catch (error) {
      logger.error('Error calculating margin:', error.message);
      return productData;
    }
  }

  /**
   * Store products in database
   */
  async storeProducts(products) {
    const pool = getPool();

    try {
      logger.info(`Storing ${products.length} products in database...`);

      const query = `
        INSERT INTO products
        (dedupe_key, asin, sku, name, category, source, source_url, current_price,
         previous_price, price_change, rating, reviews_count, best_sellers_rank,
         fba_fee, shipping_cost, margin_percentage, image_url, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (dedupe_key)
        DO UPDATE SET
          previous_price = products.current_price,
          current_price = excluded.current_price,
          price_change = excluded.current_price - products.current_price,
          rating = excluded.rating,
          reviews_count = excluded.reviews_count,
          best_sellers_rank = excluded.best_sellers_rank,
          margin_percentage = excluded.margin_percentage,
          fetched_at = NOW(),
          updated_at = NOW()
        RETURNING id, current_price
      `;

      for (const product of products) {
        const dedupeKey = [
          product.source || '',
          product.asin || '',
          product.sku || '',
          product.asin || product.sku ? '' : (product.name || '').toLowerCase().trim()
        ].join('|');

        const result = await pool.query(query, [
          dedupeKey,
          product.asin || null,
          product.sku || null,
          product.name,
          product.category || 'General',
          product.source,
          product.source_url,
          product.current_price || 0,
          product.previous_price || product.current_price || 0,
          0,
          product.rating || 0,
          product.reviews_count || 0,
          product.best_sellers_rank || null,
          product.fba_fee || 0,
          product.shipping_cost || 0,
          product.margin_percentage || 0,
          product.image_url || null
        ]);

        // Record a price-history point for charts
        const row = result.rows[0];
        if (row?.id) {
          await pool.query(
            `INSERT INTO price_history (product_id, price) VALUES ($1, $2)`,
            [row.id, row.current_price ?? product.current_price ?? 0]
          );
        }
      }

      logger.info('Products stored successfully');
      return products.length;
    } catch (error) {
      logger.error('Error storing products:', error.message);
      throw error;
    }
  }
}

export const productFetcher = new ProductFetcher();
