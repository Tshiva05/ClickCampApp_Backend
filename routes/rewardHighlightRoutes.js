// routes/rewardHighlightRoutes.js
const express = require('express');
const ctrl = require('../controllers/rewardHighlightController');

const router = express.Router();

// GET /api/reward-highlights - active ticker entries only
router.get('/', ctrl.listActiveHighlights);

module.exports = router;
