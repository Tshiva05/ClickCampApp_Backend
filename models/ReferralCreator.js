import mongoose from 'mongoose';

const referralCreatorSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    mobile: {
      type: String,
      required: true
    },

    upi: {
      type: String,
      required: true,
      trim: true
    },

    referralCode: {
      type: String,
      unique: true,
      required: true
    },

    shareUrl: {
      type: String,
      required: true
    },

    friendReward: {
      type: Number,
      default: 0
    },

    ownerReward: {
      type: Number,
      default: 0
    },

    totalClicks: {
      type: Number,
      default: 0
    },

    totalApplications: {
      type: Number,
      default: 0
    },

    totalCompleted: {
      type: Number,
      default: 0
    },

    totalEarnings: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'ReferralCreator',
  referralCreatorSchema
);
