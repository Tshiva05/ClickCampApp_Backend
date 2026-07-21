// middleware/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'clickcamp/offers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new ApiError(400, 'Only image uploads are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Guard so a missing Cloudinary config fails with a clear 500 message
// instead of a cryptic multer/cloudinary stack trace.
function requireCloudinary(req, res, next) {
  if (!isCloudinaryConfigured()) {
    return next(new ApiError(500, 'Image upload is not configured. Set CLOUDINARY_* env vars.'));
  }
  next();
}

module.exports = { upload, requireCloudinary };
