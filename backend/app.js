const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API routes
app.use('/api/pdf', pdfRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Ensure required directories exist
const requiredDirs = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../outputs')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Start server (only when run directly)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║      marronMerge Backend Server    ║
╠════════════════════════════════════╣
║  Server running on port ${PORT}...       
║  Frontend: http://localhost:${PORT}
║  API: http://localhost:${PORT}/api/pdf/health
╚════════════════════════════════════╝
  `);
  });
}

module.exports = app;
