// controllers/adminController.js
// Admin auth (unchanged from the old cashback platform - Admin model and
// JWT/cookie pattern are reused as-is), plus Offer CRUD and Application
// status management (replaces the old Campaign CRUD / Referral
// moderation, which was built around a cashback-wallet payout flow).
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Offer = require('../models/Offer');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidStatusTransition } = require('../utils/rewardSplit');
const { cloudinary } = require('../config/cloudinary');

function signAdminToken(admin) {
  return jwt.sign({ id: admin._id }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h'
  });
}
function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  };
}

// ---------- Admin auth ----------

// POST /api/admin/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!admin.isActive) throw new ApiError(403, 'This admin account has been disabled');

  const token = signAdminToken(admin);
  res.cookie('admin_token', token, adminCookieOptions());
  res.json({ success: true, data: { admin: { id: admin._id, name: admin.name, email: admin.email }, token } });
});

// POST /api/admin/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logged out' });
});

// ---------- Offer CRUD ----------

// POST /api/admin/offers
const createOffer = asyncHandler(async (req, res) => {
  const {
    title, description, rewardAmount, minSharingReward, maxSharingReward,
    conditions, affiliateUrl, playStoreUrl, redirectTarget, expiryDate, isActive
  } = req.body;

  const offer = await Offer.create({
    title,
    description,
    rewardAmount,
    minSharingReward: minSharingReward ?? 0,
    maxSharingReward: maxSharingReward ?? rewardAmount,
    conditions: Array.isArray(conditions) ? conditions : (conditions ? String(conditions).split('\n').filter(Boolean) : []),
    affiliateUrl,
    playStoreUrl: playStoreUrl || '',
    redirectTarget: redirectTarget === 'playstore' ? 'playstore' : 'affiliate',
    expiryDate: expiryDate || null,
    isActive: isActive === undefined ? true : Boolean(isActive),
    imageUrl: req.files?.image?.[0]?.path || '',
    imagePublicId: req.files?.image?.[0]?.filename || '',
    createdBy: req.admin._id
  });

  res.status(201).json({ success: true, data: { offer } });
});

// GET /api/admin/offers
const listOffersAdmin = asyncHandler(async (req, res) => {
  const offers = await Offer.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { offers } });
});

// PUT /api/admin/offers/:id
const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new ApiError(404, 'Offer not found');

  const {
    title, description, rewardAmount, minSharingReward, maxSharingReward,
    conditions, affiliateUrl, playStoreUrl, redirectTarget, expiryDate, isActive
  } = req.body;

  if (title !== undefined) offer.title = title;
  if (description !== undefined) offer.description = description;
  if (rewardAmount !== undefined) offer.rewardAmount = rewardAmount;
  if (minSharingReward !== undefined) offer.minSharingReward = minSharingReward;
  if (maxSharingReward !== undefined) offer.maxSharingReward = maxSharingReward;
  if (conditions !== undefined) {
    offer.conditions = Array.isArray(conditions) ? conditions : String(conditions).split('\n').filter(Boolean);
  }
  if (affiliateUrl !== undefined) offer.affiliateUrl = affiliateUrl;
  if (playStoreUrl !== undefined) offer.playStoreUrl = playStoreUrl;
  if (redirectTarget !== undefined) offer.redirectTarget = redirectTarget === 'playstore' ? 'playstore' : 'affiliate';
  if (expiryDate !== undefined) offer.expiryDate = expiryDate || null;
  if (isActive !== undefined) offer.isActive = Boolean(isActive);

  if (req.files?.image?.[0]) {
    if (offer.imagePublicId) await cloudinary.uploader.destroy(offer.imagePublicId).catch(() => {});
    offer.imageUrl = req.files.image[0].path;
    offer.imagePublicId = req.files.image[0].filename;
  }

  await offer.save();
  res.json({ success: true, data: { offer } });
});

// DELETE /api/admin/offers/:id
const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new ApiError(404, 'Offer not found');

  const applicationCount = await Application.countDocuments({ offer: offer._id });
  if (applicationCount > 0) {
    // Never hard-delete an offer with application/lead history - deactivate
    // instead, so existing trackers/admin records stay intact.
    offer.isActive = false;
    await offer.save();
    return res.json({ success: true, message: 'Offer has existing applications, so it was deactivated instead of deleted', data: { offer } });
  }

  if (offer.imagePublicId) await cloudinary.uploader.destroy(offer.imagePublicId).catch(() => {});
  await offer.deleteOne();
  res.json({ success: true, message: 'Offer deleted' });
});

// ---------- Application tracking dashboard ----------

// GET /api/admin/applications?q=&installStatus=&kycStatus=&paymentStatus=&page=&limit=
const listApplications = asyncHandler(async (req, res) => {
  const { q, installStatus, kycStatus, paymentStatus } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);

  const filter = {};
  if (installStatus) filter.installStatus = installStatus;
  if (kycStatus) filter.kycStatus = kycStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ mobile: rx }, { upi: rx }];
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('offer', 'title')
      .populate('referral', 'code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter)
  ]);

  res.json({ success: true, data: { applications, total, page, pages: Math.ceil(total / limit) } });
});

// PATCH /api/admin/applications/:id/install  { status: 'Pending' | 'Success' }
const updateInstallStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  const { status } = req.body;
  if (!isValidStatusTransition('install', application.installStatus, status)) {
    throw new ApiError(409, `Cannot move install status from "${application.installStatus}" to "${status}"`);
  }
  application.installStatus = status;
  application.timeline.push({ event: 'Install status updated', note: status });
  await application.save();
  res.json({ success: true, data: { application } });
});

// PATCH /api/admin/applications/:id/kyc  { status: 'Pending' | 'Success' }
const updateKycStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  const { status } = req.body;
  if (!isValidStatusTransition('kyc', application.kycStatus, status)) {
    throw new ApiError(409, `Cannot move KYC status from "${application.kycStatus}" to "${status}"`);
  }
  application.kycStatus = status;
  application.timeline.push({ event: 'KYC status updated', note: status });
  await application.save();
  res.json({ success: true, data: { application } });
});

// PATCH /api/admin/applications/:id/payment  { status: 'Pending' | 'Paid' }
// Manual payment marking only - there is no automated withdrawal system.
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  const { status } = req.body;
  if (!isValidStatusTransition('payment', application.paymentStatus, status)) {
    throw new ApiError(409, `Cannot move payment status from "${application.paymentStatus}" to "${status}"`);
  }
  application.paymentStatus = status;
  application.timeline.push({ event: 'Payment status updated', note: status === 'Paid' ? 'Manually paid via UPI by admin' : status });
  await application.save();
  res.json({ success: true, data: { application } });
});

// PATCH /api/admin/applications/:id/note
const addApplicationNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const application = await Application.findByIdAndUpdate(req.params.id, { adminNotes: note || '' }, { new: true });
  if (!application) throw new ApiError(404, 'Application not found');
  res.json({ success: true, data: { application } });
});

// GET /api/admin/applications/export.csv?q=&installStatus=&kycStatus=&paymentStatus=
const exportApplicationsCsv = asyncHandler(async (req, res) => {
  const { q, installStatus, kycStatus, paymentStatus } = req.query;
  const filter = {};
  if (installStatus) filter.installStatus = installStatus;
  if (kycStatus) filter.kycStatus = kycStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ mobile: rx }, { upi: rx }];
  }
  const applications = await Application.find(filter).populate('offer', 'title').populate('referral', 'code').sort({ createdAt: -1 });

  const header = ['Offer', 'Mobile', 'UPI', 'Referral Code', 'Reward Amount', 'Install Status', 'KYC Status', 'Payment Status', 'Notes', 'Submitted At'];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  applications.forEach((a) => {
    lines.push([
      a.offer?.title, a.mobile, a.upi, a.referral?.code || '', a.rewardAmount,
      a.installStatus, a.kycStatus, a.paymentStatus, a.adminNotes, a.createdAt.toISOString()
    ].map(esc).join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
  res.send(lines.join('\n'));
});

// ---------- Analytics ----------

// GET /api/admin/analytics
const analytics = asyncHandler(async (req, res) => {
  const [installByStatus, kycByStatus, paymentByStatus, activeOffers, totalApplications] = await Promise.all([
    Application.aggregate([{ $group: { _id: '$installStatus', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$kycStatus', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
    Offer.countDocuments({ isActive: true }),
    Application.countDocuments()
  ]);

  const toCounts = (rows, keys) => {
    const out = Object.fromEntries(keys.map((k) => [k, 0]));
    rows.forEach((r) => { out[r._id] = r.count; });
    return out;
  };

  res.json({
    success: true,
    data: {
      activeOffers,
      totalApplications,
      installStatusCounts: toCounts(installByStatus, ['Pending', 'Success']),
      kycStatusCounts: toCounts(kycByStatus, ['Pending', 'Success']),
      paymentStatusCounts: toCounts(paymentByStatus, ['Pending', 'Paid'])
    }
  });
});

module.exports = {
  login, logout,
  createOffer, listOffersAdmin, updateOffer, deleteOffer,
  listApplications, updateInstallStatus, updateKycStatus, updatePaymentStatus, addApplicationNote, exportApplicationsCsv,
  analytics
};
