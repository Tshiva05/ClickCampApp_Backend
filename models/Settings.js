// models/Settings.js
// Single-document collection holding site-wide, admin-editable config.
// Currently just the Telegram community banner, but kept generic (key
// "singleton") so future site-wide toggles can live here without a
// migration.
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'singleton', unique: true },

    telegramUrl: { type: String, default: '', trim: true },
    telegramBannerEnabled: { type: Boolean, default: true },
    telegramBannerTitle: { type: String, default: 'Join ClickCamp Telegram Community', trim: true },
    telegramBannerBenefits: {
      type: [String],
      default: ['New offers', 'Offer updates', 'Installation guides']
    }
  },
  { timestamps: true }
);

// There should only ever be one Settings document. Fetch-or-create it so
// callers never have to worry about it not existing yet.
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'singleton' });
  if (!doc) doc = await this.create({ key: 'singleton' });
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
