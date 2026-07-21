// routes/offerRoutes.js
const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/offerController');
const appCtrl = require('../controllers/applicationController');

const router = express.Router();

router.get('/', ctrl.listActiveOffers);
router.get('/:slug', ctrl.getOfferBySlug);

// Direct offer application (mobile + UPI only, no login).
router.post(
  '/:slug/apply',
  [
    body('mobile').matches(/^[0-9]{10}$/).withMessage('Mobile must be a 10-digit number'),
    body('upi').trim().isLength({ min: 3, max: 80 }).withMessage('Enter a valid UPI ID')
  ],
  validate,
  appCtrl.submitDirectApplication
);

module.exports = router;
