require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const productsRouter = require('./routes/products');

const app  = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());          // allows browser requests from any origin
app.use(express.json()); // parses incoming JSON request bodies
app.use(express.static('public')); 

// --- Routes ---
app.use('/api/products', productsRouter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});