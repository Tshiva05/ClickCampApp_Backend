// scripts/seedAdmin.js
// Usage: npm run seed:admin
// Creates (or updates the password of) the admin account defined by
// SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env. Run this once after
// connecting a fresh MongoDB Atlas database.
require('dotenv').config();
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

async function run() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.');
    process.exit(1);
  }

  await connectDB();
  const passwordHash = await Admin.hashPassword(password);

  const admin = await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { name: 'Administrator', email: email.toLowerCase(), passwordHash, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
