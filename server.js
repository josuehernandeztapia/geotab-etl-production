// server.js - Servidor Express para Cloud Run
// Migración de Vercel serverless functions a Cloud Run

const express = require('express');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'geotab-etl'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Geotab ETL API - Migrated from Vercel to Cloud Run',
    endpoints: [
      'GET /health - Health check',
      'POST /api/sync - Main sync endpoint',
      'POST /api/sync_trip - Trip sync endpoint',
      'POST /api/trip_batch - Trip batch processing'
    ],
    timestamp: new Date().toISOString()
  });
});

// Import original Vercel functions
const syncHandler = require('./api/sync');
const syncTripHandler = require('./api/sync_trip');
const tripBatchHandler = require('./api/trip_batch');

// Convert Vercel functions to Express routes
app.post('/api/sync', async (req, res) => {
  try {
    // Wrap Vercel function for Express
    const mockRes = {
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      }),
      json: (data) => res.json(data)
    };

    await syncHandler(req, mockRes);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/sync_trip', async (req, res) => {
  try {
    const mockRes = {
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      }),
      json: (data) => res.json(data)
    };

    await syncTripHandler(req, mockRes);
  } catch (error) {
    console.error('Sync trip error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/trip_batch', async (req, res) => {
  try {
    const mockRes = {
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      }),
      json: (data) => res.json(data)
    };

    await tripBatchHandler(req, mockRes);
  } catch (error) {
    console.error('Trip batch error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Geotab ETL Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync endpoint: http://localhost:${PORT}/api/sync`);
});