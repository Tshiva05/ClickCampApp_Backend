// routes/adminRoutes.js
const express = require('express');
const Admin = require('../models/Admin');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/adminAuth');
const { authLimiter } = require('../middleware/rateLimiter');
const { upload, requireCloudinary } = require('../middleware/upload');

const adminCtrl = require('../controllers/adminController');
const highlightCtrl = require('../controllers/rewardHighlightController');
const settingsCtrl = require('../controllers/settingsController');

const router = express.Router();

// ---- Admin auth (public) ----
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  adminCtrl.login
);
router.post('/logout', adminCtrl.logout);

router.get('/create-admin', async (req, res) => {
  try {
    const passwordHash = await Admin.hashPassword('T.shiv@123321');

    await Admin.findOneAndUpdate(
      { email: 'tshivavakiti@gmail.com' },
      {
        name: 'Administrator',
        email: 'tshivavakiti@gmail.com',
        passwordHash,
        isActive: true
      },
      {
        upsert: true,
        new: true
      }
    );

    res.json({
      success: true,
      message: 'Admin created successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ---- Everything below requires a valid admin session ----
router.use(requireAdmin);

// Offers
const offerImageUpload = upload.fields([{ name: 'image', maxCount: 1 }]);

router.get('/offers', adminCtrl.listOffersAdmin);
router.post(
  '/offers',
  requireCloudinary,
  offerImageUpload,
  [
    body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Title must be 2-120 characters'),
    body('rewardAmount').isFloat({ min: 1 }).withMessage('Reward amount must be a positive number'),
    body('affiliateUrl').trim().isURL().withMessage('Affiliate URL must be a valid URL')
  ],
  validate,
  adminCtrl.createOffer
);
router.put('/offers/:id', requireCloudinary, offerImageUpload, adminCtrl.updateOffer);
router.delete('/offers/:id', adminCtrl.deleteOffer);

// Applications (lead tracking dashboard)
router.get('/applications', adminCtrl.listApplications);
router.get('/applications/export.csv', adminCtrl.exportApplicationsCsv);
router.patch(
  '/applications/:id/install',
  [body('status').isIn(['Pending', 'Success']).withMessage('status must be Pending or Success')],
  validate,
  adminCtrl.updateInstallStatus
);
router.patch(
  '/applications/:id/kyc',
  [body('status').isIn(['Pending', 'Success']).withMessage('status must be Pending or Success')],
  validate,
  adminCtrl.updateKycStatus
);
router.patch(
  '/applications/:id/payment',
  [body('status').isIn(['Pending', 'Paid']).withMessage('status must be Pending or Paid')],
  validate,
  adminCtrl.updatePaymentStatus
);
router.patch('/applications/:id/note', adminCtrl.addApplicationNote);

// Reward highlights (ticker)
router.get('/reward-highlights', highlightCtrl.listAllHighlights);
router.post(
  '/reward-highlights',
  [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number')
  ],
  validate,
  highlightCtrl.createHighlight
);
router.put('/reward-highlights/:id', highlightCtrl.updateHighlight);
router.delete('/reward-highlights/:id', highlightCtrl.deleteHighlight);

// Settings (Telegram banner)
router.get('/settings', settingsCtrl.getAdminSettings);
router.put('/settings', settingsCtrl.updateSettings);

// Analytics
router.get('/analytics', adminCtrl.analytics);

module.exports = router;
    
