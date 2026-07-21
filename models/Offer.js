// models/Offer.js
// Replaces the old models/Campaign.js. An Offer is an affiliate
// campaign users can apply to - NOT a cashback-wallet campaign.
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },

    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' }, // Cloudinary asset id, for clean deletes/replacements

    description: { type: String, default: '', trim: true },
    conditions: { type: [String], default: [] }, // e.g. ["Install application", "Register mobile number", "Complete KYC"]

    rewardAmount: { type: Number, required: true, min: 1 },
    minSharingReward: { type: Number, required: true, min: 0 },
    maxSharingReward: { type: Number, required: true, min: 0 },

    affiliateUrl: { type: String, required: true, trim: true },
    playStoreUrl: { type: String, default: '', trim: true },
    // Which link a user is redirected to right after submitting the form.
    redirectTarget: { type: String, enum: ['affiliate', 'playstore'], default: 'affiliate' },

    expiryDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

offerSchema.index({ slug: 1 }, { unique: true });
offerSchema.index({ isActive: 1, createdAt: -1 });

offerSchema.pre('validate', function (next) {
  if (this.title && (!this.slug || this.isModified('title'))) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);
  }
  next();
});

offerSchema.pre('validate', function (next) {
  if (this.maxSharingReward === undefined) this.maxSharingReward = this.rewardAmount;
  if (this.minSharingReward > this.maxSharingReward) {
    return next(new Error('minSharingReward cannot exceed maxSharingReward'));
  }
  if (this.maxSharingReward > this.rewardAmount) {
    return next(new Error('maxSharingReward cannot exceed rewardAmount'));
  }
  next();
});

// True once past expiryDate (still isActive in DB, but not shown/applyable).
offerSchema.methods.isExpired = function () {
  return Boolean(this.expiryDate) && this.expiryDate.getTime() < Date.now();
};

offerSchema.methods.isLive = function () {
  return this.isActive && !this.isExpired();
};

module.exports = mongoose.model('Offer', offerSchema);
