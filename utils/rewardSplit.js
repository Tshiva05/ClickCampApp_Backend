// utils/rewardSplit.js
// Pure functions only - no requires of express/mongoose/etc - so this file
// (and its tests) run with plain `node` even before `npm install` has been
// run. Single source of truth for the referral reward-split calculation;
// controllers/referralController-equivalent logic calls into this rather
// than reimplementing the math. Adapted from the old referralMath.js to
// operate on Offer.rewardAmount / min-max sharing range instead of a
// cashback-wallet split.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Validate and compute the friend/referrer reward split for an offer's
 * referral link.
 * @param {number} rewardAmount - the offer's full reward amount (> 0)
 * @param {number} minSharingReward - lowest amount a referrer may give a friend
 * @param {number} maxSharingReward - highest amount a referrer may give a friend (usually === rewardAmount)
 * @param {number} friendReward - amount the referrer chose to give the friend
 * @returns {{ friendReward: number, referrerEarning: number }}
 * @throws {Error} if friendReward is not within [minSharingReward, maxSharingReward]
 */
function computeReferralSplit(rewardAmount, minSharingReward, maxSharingReward, friendReward) {
  const total = Number(rewardAmount);
  const min = Number(minSharingReward);
  const max = Number(maxSharingReward);
  const friend = Number(friendReward);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Invalid offer reward amount');
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > total || min > max) {
    throw new Error('Invalid min/max sharing reward range');
  }
  if (!Number.isFinite(friend) || friend < min || friend > max) {
    throw new Error(`Friend reward must be between ${min} and ${max}`);
  }

  return {
    friendReward: round2(friend),
    referrerEarning: round2(total - friend)
  };
}

/** Generate a random, URL-safe 6-character referral code. */
function generateReferralCode(randomBytesFn) {
  // randomBytesFn is injected so this stays testable without requiring
  // Node's crypto module to be mocked; falls back to crypto if omitted.
  const bytes = randomBytesFn ? randomBytesFn(4) : require('crypto').randomBytes(4);
  return bytes.toString('hex').slice(0, 6).toUpperCase();
}

const INSTALL_TRANSITIONS = { Pending: ['Success'], Success: [] };
const KYC_TRANSITIONS = { Pending: ['Success'], Success: [] };
const PAYMENT_TRANSITIONS = { Pending: ['Paid'], Paid: [] };

function isValidStatusTransition(kind, from, to) {
  const table = kind === 'install' ? INSTALL_TRANSITIONS : kind === 'kyc' ? KYC_TRANSITIONS : PAYMENT_TRANSITIONS;
  if (from === to) return true; // allow idempotent re-saves from the admin UI
  return Array.isArray(table[from]) && table[from].includes(to);
}

module.exports = { computeReferralSplit, generateReferralCode, isValidStatusTransition, round2 };
