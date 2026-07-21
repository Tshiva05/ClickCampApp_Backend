// models/Application.js
// Replaces the old models/Referral.js (which modeled a cashback-wallet
// split). An Application is a single lead: a mobile number + UPI ID
// submitted against an Offer, optionally via someone else's Referral
// link. No login, no wallet - just lead + status tracking.
const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema(
  { event: String, note: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },

    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile must be a 10-digit number']
    },
    upi: { type: String, required: true, trim: true, maxlength: 80 },

    // Set only if this application came in through someone else's referral link.
    referral: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', default: null },

    // Snapshot of what this specific application is worth: offer.rewardAmount
    // for a direct/original submission, or referral.friendReward if referred.
    rewardAmount: { type: Number, required: true },

    installStatus: { type: String, enum: ['Pending', 'Success'], default: 'Pending' },
    kycStatus: { type: String, enum: ['Pending', 'Success'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },

    adminNotes: { type: String, default: '' },
    timeline: { type: [timelineEntrySchema], default: () => [{ event: 'Submitted', note: 'Application submitted' }] }
  },
  { timestamps: true }
);

applicationSchema.index({ offer: 1, createdAt: -1 });
applicationSchema.index({ mobile: 1, createdAt: -1 });
applicationSchema.index({ referral: 1 });

// Public-facing status label combining installStatus/kycStatus, matching
// the tracking page spec: Pending / Installed / Verified.
applicationSchema.methods.applicationStatusLabel = function () {
  if (this.kycStatus === 'Success' && this.installStatus === 'Success') return 'Verified';
  if (this.installStatus === 'Success') return 'Installed';
  return 'Pending';
};

module.exports = mongoose.model('Application', applicationSchema);
