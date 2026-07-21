// controllers/rewardHighlightController.js
// Public read + admin CRUD for the homepage reward ticker entries.
const RewardHighlight = require('../models/RewardHighlight');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// ---------- Public ----------

// GET /api/reward-highlights
const listActiveHighlights = asyncHandler(async (req, res) => {
  const highlights = await RewardHighlight.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, data: { highlights } });
});

// ---------- Admin ----------

// GET /api/admin/reward-highlights
const listAllHighlights = asyncHandler(async (req, res) => {
  const highlights = await RewardHighlight.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, data: { highlights } });
});

// POST /api/admin/reward-highlights
const createHighlight = asyncHandler(async (req, res) => {
  const { name, amount, isActive, order } = req.body;
  const highlight = await RewardHighlight.create({ name, amount, isActive, order });
  res.status(201).json({ success: true, data: { highlight } });
});

// PUT /api/admin/reward-highlights/:id
const updateHighlight = asyncHandler(async (req, res) => {
  const highlight = await RewardHighlight.findById(req.params.id);
  if (!highlight) throw new ApiError(404, 'Reward highlight not found');

  const { name, amount, isActive, order } = req.body;
  if (name !== undefined) highlight.name = name;
  if (amount !== undefined) highlight.amount = amount;
  if (isActive !== undefined) highlight.isActive = isActive;
  if (order !== undefined) highlight.order = order;

  await highlight.save();
  res.json({ success: true, data: { highlight } });
});

// DELETE /api/admin/reward-highlights/:id
const deleteHighlight = asyncHandler(async (req, res) => {
  const highlight = await RewardHighlight.findByIdAndDelete(req.params.id);
  if (!highlight) throw new ApiError(404, 'Reward highlight not found');
  res.json({ success: true, message: 'Reward highlight deleted' });
});

module.exports = { listActiveHighlights, listAllHighlights, createHighlight, updateHighlight, deleteHighlight };
