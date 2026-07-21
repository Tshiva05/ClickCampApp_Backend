// routes/applicationRoutes.js
const express = require('express');
const ctrl = require('../controllers/applicationController');

const router = express.Router();

// GET /api/applications/track?mobile=9999999999
router.get('/track', ctrl.trackByMobile);

module.exports = router;
