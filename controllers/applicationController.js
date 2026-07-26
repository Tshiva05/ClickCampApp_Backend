// controllers/applicationController.js
// Public-facing application (lead) endpoints. Applications carry only
// mobile + UPI - never a password, never a wallet balance.
const Offer = require('../models/Offer');
const Application = require('../models/Application');
const Referral = require('../models/Referral');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateReferralCode } = require('../utils/rewardSplit');

function isLive(offer) {
  const notExpired = !offer.expiryDate || offer.expiryDate.getTime() >= Date.now();
  return offer.isActive && notExpired;
}

function redirectUrlFor(offer) {
  if (offer.redirectTarget === 'playstore' && offer.playStoreUrl) return offer.playStoreUrl;
  return offer.affiliateUrl;
}

async function uniqueReferralCode() {
  // Extremely unlikely to collide (6 hex chars), but guard anyway since
  // the code is a unique index.
  for (let i = 0; i < 5; i += 1) {
    const code = generateReferralCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Referral.exists({ code });
    if (!exists) return code;
  }
  throw new ApiError(500, 'Could not generate a unique referral code, please retry');
}

// POST /api/offers/:slug/apply  { name , mobile, upi }
// Direct submission (not via a friend's referral link). Creates the
// Application, then auto-generates a shareable Referral for this
// submitter at the offer's default (max) sharing reward.
const submitDirectApplication = asyncHandler(async (req, res) => {
  console.log("submitDirectApplication called");
  
  const offer = await Offer.findOne({ slug: req.params.slug });
  if (!offer || !isLive(offer)) throw new ApiError(404, 'Offer not found or no longer active');

  const { name, mobile, upi } = req.body;

  const application = await Application.create({
    offer: offer._id,
    name,
    mobile,
    upi,
    rewardAmount: offer.rewardAmount
  });



res.status(201).json({
  success: true,
  data: {
    applicationId: application._id,
    application,
    redirectUrl: redirectUrlFor(offer)
  }
});

  



});

// GET /api/applications/track?mobile=9999999999
// Public tracker - no auth. Returns every application submitted with that
// mobile number, across all offers.
const trackByMobile = asyncHandler(async (req, res) => {
  const { mobile } = req.query;
  if (!/^[0-9]{10}$/.test(String(mobile || ''))) {
    throw new ApiError(400, 'Enter a valid 10-digit mobile number');
  }

  const applications = await Application.find({ mobile }).populate('offer', 'title rewardAmount').sort({ createdAt: -1 });

  const results = applications.map((app) => ({
    id: app._id,
    offerName: app.offer?.title,
    rewardAmount: app.rewardAmount,
    applicationStatus: app.applicationStatusLabel(), // Pending / Installed / Verified
    kycStatus: app.kycStatus,       // Pending / Success
    paymentStatus: app.paymentStatus, // Pending / Paid
    submittedAt: app.createdAt
  }));

  res.json({ success: true, data: { applications: results } });
});



const createReferral = asyncHandler(async (req, res) => {
console.log("createReferral called");
  
  const application = await Application.findById(req.params.id).populate('offer');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  const offer = application.offer;

  const existingReferral = await Referral.findOne({
    ownerApplication: application._id
  });

  if (existingReferral) {
    return res.json({
      success: true,
      data: {
        referral: {
          code: existingReferral.code,
          friendReward: existingReferral.friendReward,
          referrerEarning: existingReferral.referrerEarning,
          minSharingReward: offer.minSharingReward,
          maxSharingReward: offer.maxSharingReward,
          offerRewardAmount: offer.rewardAmount,
          shareUrl: `${process.env.USER_SITE_URL || ''}/offer/${offer.slug}/ref/${existingReferral.code}`
        }
      }
    });
  }

  const code = await uniqueReferralCode();

  const referral = await Referral.create({
    code,
    offer: offer._id,
    ownerApplication: application._id,
    offerRewardAmount: offer.rewardAmount,
    friendReward: offer.maxSharingReward,
    referrerEarning: offer.rewardAmount - offer.maxSharingReward
  });

  res.json({
    success: true,
    data: {
      referral: {
        code: referral.code,
        friendReward: referral.friendReward,
        referrerEarning: referral.referrerEarning,
        minSharingReward: offer.minSharingReward,
        maxSharingReward: offer.maxSharingReward,
        offerRewardAmount: offer.rewardAmount,
        shareUrl: `${process.env.USER_SITE_URL || ''}/offer/${offer.slug}/ref/${referral.code}`
     
      }
    }
  });
                                                                
});     
module.exports = {
  submitDirectApplication,
  trackByMobile,
  createReferral
};
