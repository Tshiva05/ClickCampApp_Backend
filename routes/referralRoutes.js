// routes/referralRoutes.js
const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/referralController');

const router = express.Router();

router.get('/:code', ctrl.getReferralByCode);

router.patch(
  '/:code/split',
  [body('friendReward').isFloat({ min: 0 }).withMessage('friendReward must be a non-negative number')],
  validate,
  ctrl.updateReferralSplit
);

router.post(
  '/:code/apply',
  [
    body('mobile').matches(/^[0-9]{10}$/).withMessage('Mobile must be a 10-digit number'),
    body('upi').trim().isLength({ min: 3, max: 80 }).withMessage('Enter a valid UPI ID')
  ],
  validate,
  ctrl.submitViaReferral
);
router.post(
  '/create',
  [
    body('offerSlug').notEmpty().withMessage('Offer slug is required'),
    body('name').trim().isLength({ min: 3 }).withMessage('Enter your full name'),
    body('mobile')
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile must be a 10-digit number'),
    body('upi')
      .trim()
      .isLength({ min: 3, max: 80 })
      .withMessage('Enter a valid UPI ID')
  ],
  validate,
  ctrl.createReferralWithoutInstall
);

module.exports = router;
