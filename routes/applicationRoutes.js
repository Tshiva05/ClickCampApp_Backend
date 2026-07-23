// routes/applicationRoutes.js
const express = require('express');
const ctrl = require('../controllers/applicationController');

const router = express.Router();

// GET /api/applications/track?mobile=9999999999
router.get('/track', ctrl.trackByMobile);
 

// POST /api/applications/:id/create-referral
router.post('/:id/create-referral', ctrl.createReferral);

module.exports = router;
