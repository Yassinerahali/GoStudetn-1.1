const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const bookingRoutes = require('./routes/bookings');
const vehicleRoutes = require('./routes/vehicles');
const connectDB = require('./config/db');

const app = express();

// Middleware to parse JSON request bodies and allow CORS.
app.use(express.json());
app.use(cors());

// Serve static frontend files from public folder.
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes under /api.
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Fallback to index.html for client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;

connectDB().then(() => {
  console.log(`Starting server on port ${port}`);
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});
