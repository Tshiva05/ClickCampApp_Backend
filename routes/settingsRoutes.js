// routes/settingsRoutes.js
const express = require('express');
const ctrl = require('../controllers/settingsController');

const router = express.Router();

// GET /api/settings - public (Telegram URL + banner enable/disable)
router.get('/', ctrl.getPublicSettings);

module.exports = router;
