# Product Catalog API

A high-performance backend REST API built for browsing a catalog of 200,000 products. This project implements advanced pagination techniques to guarantee data consistency during live mutations (insertions/updates), ensuring users never see duplicates or miss items while browsing.

---

## 🚀 Key Features

* **Robust Data Consistency:** Implements a composite **Cursor Pagination** strategy (`created_at` + `id`) to solve the "shifting offset" problem, ensuring perfect pagination even when new products are added continuously.
* **Optimized Database Queries:** Utilizes composite indexes tailored specifically for time-based sorting and category filtering across massive datasets.
* **High-Speed Data Seeding:** Includes a highly optimized bulk-insert seed script capable of generating and loading 200,000 products quickly.
* **RESTful API:** Clean, well-structured Express API for fetching and filtering products.
* **Static File Serving:** Built-in support to serve a frontend client from the `public` directory.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v24+)
* **Framework:** Express.js
* **Database:** PostgreSQL (Hosted on [Supabase](https://supabase.com/))
* **Database Driver:** `pg` (node-postgres)
* **Deployment:** railway

---

## 📂 Project Structure

```text
codevector_products/
├── src/
│   ├── index.js          # Express app entry point & static file routing
│   ├── db.js             # Database connection pool configuration
│   └── routes/
│       └── products.js   # Product-related API endpoints
├── scripts/
│   └── seed.js           # Bulk data generation and insertion script
├── public/               # Frontend static assets (HTML, CSS, JS)
├── .env                  # Environment variables (Ignored by Git)
├── .env.example          # Environment variables template
├── .gitignore
└── package.json

```

---

## 🗄️ Database Architecture

### Schema

The `products` table uses a standard UUID for unguessable identifiers and timezone-aware timestamps for precise ordering.

```sql
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

```

### Indexing Strategy

To prevent full table scans on the 200,000 rows, specific composite indexes are used:

```sql
-- Optimizes raw fetching (newest first)
CREATE INDEX idx_products_pagination 
ON products(created_at DESC, id DESC);

-- Optimizes filtered fetching
CREATE INDEX idx_products_category_pagination 
ON products(category, created_at DESC, id DESC);

```

---

## ⚙️ How Cursor Pagination Works

Traditional `OFFSET/LIMIT` pagination fails when data is dynamic; if new rows are inserted at the top of the list, the entire table shifts down, causing duplicates on subsequent pages.

This API avoids that by using a **Composite Cursor**. We encode the last seen `created_at` timestamp and `id` into a base64 string. The database then fetches rows that strictly occur *after* that exact bookmark:

```sql
WHERE (created_at < $cursor_created_at) 
   OR (created_at = $cursor_created_at AND id < $cursor_id)
ORDER BY created_at DESC, id DESC

```

---

## 📡 API Documentation

### Get Products

Retrieves a paginated list of products, sorted by newest first.

**Endpoint:** `GET /api/products`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `limit` | number | No | `20` | Number of items to return |
| `cursor` | string | No | `null` | Base64 encoded cursor from the previous response |
| `category` | string | No | `null` | Filter products by exact category name |

**Response Example:**

```json
{
  "data": [
    {
      "id": "c1f7b...uuid",
      "name": "Wireless Headphones",
      "category": "Electronics",
      "price": "89.99",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyN...",
  "hasMore": true
}

```

---

## 💻 Setup & Installation

**1. Clone the repository and install dependencies**

```bash
git clone <repository-url>
cd codevector_products
npm install

```

**2. Configure Environment Variables**
Create a `.env` file in the root directory.

*Important Note for Supabase:* You must use the **Connection Pooler** URL (Transaction mode, port `6543`), not the direct database URL. Be sure to URL-encode any special characters in your password (e.g., `@` becomes `%40`).

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[URL-ENCODED-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
PORT=3000

```

**3. Seed the Database**
Run the bulk insertion script to generate 200,000 products.

```bash
npm run seed

```

**4. Start the Development Server**

```bash
npm run dev

```

The server will start on `