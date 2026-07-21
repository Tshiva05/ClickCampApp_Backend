// controllers/referralController.js
// Public-facing referral link endpoints. A Referral is created
// automatically when someone submits an Offer directly (see
// applicationController.submitDirectApplication). These endpoints let
// the referrer adjust their split and let friends view/apply through
// the link - friends never see reward-editing controls.
const Offer = require('../models/Offer');
const Referral = require('../models/Referral');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { computeReferralSplit } = require('../utils/rewardSplit');

function isLive(offer) {
  const notExpired = !offer.expiryDate || offer.expiryDate.getTime() >= Date.now();
  return offer.isActive && notExpired;
}

function redirectUrlFor(offer) {
  if (offer.redirectTarget === 'playstore' && offer.playStoreUrl) return offer.playStoreUrl;
  return offer.affiliateUrl;
}

// GET /api/referrals/:code
// What a referred friend (or the referrer, revisiting their own link)
// sees: offer details + the fixed friend reward. No editing controls.
const getReferralByCode = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ code: req.params.code.toUpperCase() }).populate('offer');
  if (!referral) throw new ApiError(404, 'Referral link not found');
  if (!referral.offer || !isLive(referral.offer)) throw new ApiError(404, 'This offer is no longer active');

  res.json({
    success: true,
    data: {
      offer: {
        title: referral.offer.title,
        slug: referral.offer.slug,
        imageUrl: referral.offer.imageUrl,
        description: referral.offer.description,
        conditions: referral.offer.conditions
      },
      friendReward: referral.friendReward
    }
  });
});

// PATCH /api/referrals/:code/split  { friendReward }
// Lets the ORIGINAL referrer move the slider after submitting. There's
// no login, so the code itself (shown only to them right after they
// submit, before they've shared it) is the access key - identical
// trust model to the rest of this no-auth public flow.
const updateReferralSplit = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ code: req.params.code.toUpperCase() }).populate('offer');
  if (!referral) throw new ApiError(404, 'Referral link not found');

  const { friendReward } = req.body;
  const { offer } = referral;
  const { friendReward: newFriendReward, referrerEarning } = computeReferralSplit(
    offer.rewardAmount,
    offer.minSharingReward,
    offer.maxSharingReward,
    friendReward
  );

  referral.friendReward = newFriendReward;
  referral.referrerEarning = referrerEarning;
  await referral.save();

  res.json({ success: true, data: { friendReward: referral.friendReward, referrerEarning: referral.referrerEarning } });
});

// POST /api/referrals/:code/apply  { mobile, upi }
// A friend submits through the referral link. Creates their own
// Application, valued at the referral's fixed friendReward.
const submitViaReferral = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ code: req.params.code.toUpperCase() }).populate('offer');
  if (!referral) throw new ApiError(404, 'Referral link not found');
  if (!referral.offer || !isLive(referral.offer)) throw new ApiError(404, 'This offer is no longer active');

  const { mobile, upi } = req.body;

  const application = await Application.create({
    offer: referral.offer._id,
    mobile,
    upi,
    referral: referral._id,
    rewardAmount: referral.friendReward
  });

  res.status(201).json({
    success: true,
    data: { application, redirectUrl: redirectUrlFor(referral.offer) }
  });
});

module.exports = { getReferralByCode, updateReferralSplit, submitViaReferral };
