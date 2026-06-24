const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

// --- Cursor helpers ---
function encodeCursor(created_at, id) {
  const payload = JSON.stringify({ created_at, id });
  return Buffer.from(payload).toString('base64');
}

function decodeCursor(cursor) {
  try {
    const payload = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null; // invalid cursor string
  }
}

// --- GET /api/products ---
router.get('/', async (req, res) => {
  try {
    // 1. Parse and validate inputs
    const limit    = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const category = req.query.category || null;
    const cursor   = req.query.cursor   || null;

    // 2. Build WHERE clause dynamically
    const params     = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);

      if (!decoded) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }

      const { created_at, id } = decoded;

      params.push(created_at);
      const tsIndex = params.length; // e.g. $1 or $2

      params.push(id);
      const idIndex = params.length; // always tsIndex + 1

      conditions.push(`
        (created_at < $${tsIndex}
          OR (created_at = $${tsIndex} AND id < $${idIndex}))
      `);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 3. Add limit param (fetch one extra to detect next page)
    params.push(limit + 1);
    const limitIndex = params.length;

    // 4. Build and run query
    const sql = `
      SELECT id, name, category, price, created_at, updated_at
      FROM   products
      ${whereClause}
      ORDER  BY created_at DESC, id DESC
      LIMIT  $${limitIndex}
    `;

    const result = await pool.query(sql, params);
    const rows   = result.rows;

    // 5. Determine if there are more pages
    const hasMore = rows.length > limit;
    const data    = hasMore ? rows.slice(0, limit) : rows;

    // 6. Build next cursor from the last item we're returning
    const lastItem   = data[data.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor(lastItem.created_at, lastItem.id)
      : null;

    // 7. Respond
    res.json({ data, nextCursor, hasMore });

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;