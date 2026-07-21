// controllers/offerController.js
// Public-facing offer endpoints (no auth). Admin CRUD for offers lives in
// adminController.js, mounted under the authenticated /api/admin routes.
const Offer = require('../models/Offer');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function isLive(offer) {
  const notExpired = !offer.expiryDate || offer.expiryDate.getTime() >= Date.now();
  return offer.isActive && notExpired;
}

// GET /api/offers - active, non-expired offers only
const listActiveOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({
    isActive: true,
    $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }]
  })
    .select('-createdBy')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { offers } });
});

// GET /api/offers/:slug
const getOfferBySlug = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ slug: req.params.slug }).select('-createdBy');
  if (!offer || !isLive(offer)) throw new ApiError(404, 'Offer not found or no longer active');
  res.json({ success: true, data: { offer } });
});

module.exports = { listActiveOffers, getOfferBySlug };
