// models/RewardHighlight.js
// Admin-editable entries shown in the homepage's auto-scrolling reward
// ticker (e.g. "Shiva earned ₹500"). Illustrative examples only - never
// presented as verified payment proof.
const mongoose = require('mongoose');

const rewardHighlightSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 } // controls left-to-right display order in the ticker
  },
  { timestamps: true }
);

rewardHighlightSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('RewardHighlight', rewardHighlightSchema);
