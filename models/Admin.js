// models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Admins are intentionally a SEPARATE collection/model from Users, not a
// `role` field on User. This means a compromised or forged user JWT can
// never satisfy admin auth, even in principle - the admin middleware only
// ever looks up Admin documents with a distinct JWT secret.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

adminSchema.index({ email: 1 }, { unique: true });

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

adminSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model('Admin', adminSchema);
