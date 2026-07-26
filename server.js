// server.js

console.log("Backend version: July 26 - TEST");

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const offerRoutes = require('./routes/offerRoutes');
const referralRoutes = require('./routes/referralRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const rewardHighlightRoutes = require('./routes/rewardHighlightRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ---- Security & core middleware ----
app.set('trust proxy', 1); // needed for correct secure-cookie/rate-limit behavior behind a reverse proxy (Render/Railway/Heroku/etc)

// This is now a pure JSON API consumed by two separate frontend apps
// (clickcamp-user, clickcamp-admin), so the CSP/static-serving concerns
// from the old vanilla-HTML build no longer apply - default Helmet CSP
// is fine here.
app.use(helmet());

// Two allowed origins: the public user site and the admin dashboard.
// Configure both in .env as a comma-separated CLIENT_URLS list.
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
app.use('/api', apiLimiter);

// ---- Health check (for load balancers / uptime monitors) ----
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

// ---- API routes ----
app.use('/api/offers', offerRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reward-highlights', rewardHighlightRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

// ---- Start ----
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`ClickCamp backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful shutdown so in-flight requests finish and the Mongo
  // connection closes cleanly on deploy/restart.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(() => {
      require('mongoose').connection.close(false, () => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;
