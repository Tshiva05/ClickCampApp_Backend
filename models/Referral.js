// models/Referral.js
// A Referral is the shareable link generated after a user submits an
// Offer. It snapshots the reward split the original submitter chose via
// the min/max sharing slider. NOT a wallet - just link + split config.
// Friends who open the link submit their own Application against this
// Referral (see models/Application.js).
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    // The original submitter's own Application - identifies who owns this link.
    
    creator: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ReferralCreator',
  required: false
},
    
    
    ownerApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: false },

    offerRewardAmount: { type: Number, required: false }, // snapshot of Offer.rewardAmount at creation
    friendReward: { type: Number, required: true },       // chosen via slider, between offer's min/max sharing reward
    referrerEarning: { type: Number, required: true }      // offerRewardAmount - friendReward
  },
  { timestamps: true }
);

referralSchema.index({ code: 1 }, { unique: true });
referralSchema.index({ offer: 1, createdAt: -1 });
referralSchema.index({ creator: 1 });
referralSchema.index({ ownerApplication: 1 });

module.exports = mongoose.model('Referral', referralSchema);
