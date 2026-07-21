// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Admin = require('../models/Admin');

// Inlined here (rather than imported from a shared auth.js) because
// ClickCamp has no user-auth system at all - Admin is the ONLY
// authenticated identity in this backend. Any failure here returns 403,
// not a redirect or 401 - admin existence/routes should not be
// discoverable via a 401-vs-404 timing or a login-page bounce that
// leaks route structure to end users.
function extractToken(req, cookieName) {
  if (req.cookies && req.cookies[cookieName]) return req.cookies[cookieName];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = extractToken(req, 'admin_token');
  if (!token) throw new ApiError(403, 'Forbidden');

  let payload;
  try {
    payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (e) {
    throw new ApiError(403, 'Forbidden');
  }

  const admin = await Admin.findById(payload.id);
  if (!admin || !admin.isActive) throw new ApiError(403, 'Forbidden');

  req.admin = admin;
  next();
});

module.exports = { requireAdmin };
