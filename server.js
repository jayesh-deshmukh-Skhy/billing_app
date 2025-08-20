import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import QRCode from 'qrcode';
import Razorpay from 'razorpay';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('dist'));

// Initialize SQLite Database
const db = new sqlite3.Database('./cloth_shop.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    discount REAL DEFAULT 0,
    category TEXT,
    size TEXT,
    color TEXT,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_phone TEXT,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    razorpay_order_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert sample products
  db.run(`INSERT OR IGNORE INTO products (id, name, description, price, discount, category, size, color, stock) VALUES
    (1, 'Cotton Casual Shirt', 'Premium cotton casual shirt for everyday wear', 899.00, 10, 'Shirts', 'M', 'Blue', 25),
    (2, 'Formal Trouser', 'Professional formal trouser perfect for office', 1299.00, 15, 'Trousers', 'L', 'Black', 20),
    (3, 'Designer T-Shirt', 'Trendy designer t-shirt with modern print', 599.00, 5, 'T-Shirts', 'S', 'White', 30),
    (4, 'Denim Jeans', 'Classic denim jeans with perfect fit', 1599.00, 20, 'Jeans', 'M', 'Blue', 15),
    (5, 'Summer Dress', 'Elegant summer dress for special occasions', 2199.00, 25, 'Dresses', 'M', 'Pink', 18)
  `);
});

// Razorpay instance (use your keys)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret'
});

// Routes

// Get all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add product
app.post('/api/products', (req, res) => {
  const { name, description, price, discount, category, size, color, stock } = req.body;
  
  db.run(
    'INSERT INTO products (name, description, price, discount, category, size, color, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description, price, discount || 0, category, size, color, stock || 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Product added successfully' });
    }
  );
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount, category, size, color, stock } = req.body;
  
  db.run(
    'UPDATE products SET name = ?, description = ?, price = ?, discount = ?, category = ?, size = ?, color = ?, stock = ? WHERE id = ?',
    [name, description, price, discount || 0, category, size, color, stock || 0, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Product updated successfully' });
    }
  );
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

// Create order
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, items, total_amount, discount_amount } = req.body;
  
  db.run(
    'INSERT INTO orders (customer_name, customer_phone, items, total_amount, discount_amount) VALUES (?, ?, ?, ?, ?)',
    [customer_name, customer_phone, JSON.stringify(items), total_amount, discount_amount || 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Order created successfully' });
    }
  );
});

// Generate QR Code for payment
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    
    // Create Razorpay order
    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${orderId}`
    };
    
    const order = await razorpay.orders.create(options);
    
    // Generate payment URL (you can customize this based on your payment flow)
    const paymentUrl = `upi://pay?pa=merchant@upi&pn=ClothShop&am=${amount}&cu=INR&tn=Payment for Order ${orderId}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(paymentUrl);
    
    res.json({
      qrCode,
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Cloth Shop Server running on http://localhost:${PORT}`);
  console.log('📊 Database: SQLite');
  console.log('💳 Payment: Razorpay Integration');
});