require('dotenv').config();
const { Pool } = require('pg');

// --- Configuration ---
const CATEGORIES = [
  'Electronics', 'Clothing',    'Books',       'Home & Garden',
  'Sports',      'Toys',        'Food',        'Beauty',
  'Automotive',  'Music'
];

const TOTAL      = 200_000;  // total products to generate
const BATCH_SIZE = 1_000;    // rows per INSERT query

// --- Database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- Helper: random float between min and max ---
function randomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// --- Helper: random date between Jan 2022 and now ---
function randomDate() {
  const start = new Date('2022-01-01').getTime();
  const end   = new Date().getTime();
  return new Date(start + Math.random() * (end - start));
}

// --- Main seed function ---
async function seed() {
  console.log(`Starting seed: ${TOTAL.toLocaleString()} products in batches of ${BATCH_SIZE}...`);

  const totalBatches = TOTAL / BATCH_SIZE;

  for (let batch = 0; batch < totalBatches; batch++) {
    const values       = [];   // flat array of actual values: [name1, cat1, price1, ...]
    const placeholders = [];   // array of placeholder strings: ['($1,$2,$3,$4,$5)', ...]

    for (let i = 0; i < BATCH_SIZE; i++) {
      const globalIndex = batch * BATCH_SIZE + i + 1; // 1 → 200,000
      const category    = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const price       = randomPrice(1, 10000);
      const date        = randomDate();

      const base = i * 5; // 5 columns per row
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );
      values.push(`Product ${globalIndex}`, category, price, date, date);
    }

    const sql = `
      INSERT INTO products (name, category, price, created_at, updated_at)
      VALUES ${placeholders.join(', ')}
    `;

    await pool.query(sql, values);

    // Progress log every 10,000 products
    if ((batch + 1) % 10 === 0) {
      console.log(`  ✓ ${((batch + 1) * BATCH_SIZE).toLocaleString()} / ${TOTAL.toLocaleString()}`);
    }
  }

  console.log('\n✅ Seed complete!');
  await pool.end(); // close the connection pool cleanly
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});