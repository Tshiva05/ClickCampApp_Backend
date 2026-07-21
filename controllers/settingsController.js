// controllers/settingsController.js
// Public read + admin update for site-wide settings (currently just the
// Telegram community banner).
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/settings - public
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({
    success: true,
    data: {
      telegramUrl: settings.telegramUrl,
      telegramBannerEnabled: settings.telegramBannerEnabled,
      telegramBannerTitle: settings.telegramBannerTitle,
      telegramBannerBenefits: settings.telegramBannerBenefits
    }
  });
});

// GET /api/admin/settings
const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ success: true, data: { settings } });
});

// PUT /api/admin/settings
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { telegramUrl, telegramBannerEnabled, telegramBannerTitle, telegramBannerBenefits } = req.body;

  if (telegramUrl !== undefined) settings.telegramUrl = telegramUrl;
  if (telegramBannerEnabled !== undefined) settings.telegramBannerEnabled = telegramBannerEnabled;
  if (telegramBannerTitle !== undefined) settings.telegramBannerTitle = telegramBannerTitle;
  if (telegramBannerBenefits !== undefined) {
    settings.telegramBannerBenefits = Array.isArray(telegramBannerBenefits)
      ? telegramBannerBenefits
      : String(telegramBannerBenefits).split('\n').filter(Boolean);
  }

  await settings.save();
  res.json({ success: true, data: { settings } });
});

module.exports = { getPublicSettings, getAdminSettings, updateSettings };
