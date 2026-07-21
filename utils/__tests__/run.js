// utils/__tests__/run.js
// Plain-node unit tests (no test framework dependency) for the pure
// business logic in utils/rewardSplit.js. Run with: npm run test:unit
const assert = require('assert');
const { computeReferralSplit, isValidStatusTransition, round2 } = require('../rewardSplit');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('computeReferralSplit()');
test('splits 500 reward / min 400 max 500 / friend 450 -> friend 450, referrer 50', () => {
  const r = computeReferralSplit(500, 400, 500, 450);
  assert.strictEqual(r.friendReward, 450);
  assert.strictEqual(r.referrerEarning, 50);
});
test('boundary: friend = min -> referrer gets the most allowed', () => {
  const r = computeReferralSplit(500, 400, 500, 400);
  assert.strictEqual(r.friendReward, 400);
  assert.strictEqual(r.referrerEarning, 100);
});
test('boundary: friend = max -> referrer gets the least allowed', () => {
  const r = computeReferralSplit(500, 400, 500, 500);
  assert.strictEqual(r.friendReward, 500);
  assert.strictEqual(r.referrerEarning, 0);
});
test('rejects friend below min', () => {
  assert.throws(() => computeReferralSplit(500, 400, 500, 399), /Friend reward must be between 400 and 500/);
});
test('rejects friend above max', () => {
  assert.throws(() => computeReferralSplit(500, 400, 500, 501), /Friend reward must be between 400 and 500/);
});
test('rejects non-numeric friend amount', () => {
  assert.throws(() => computeReferralSplit(500, 400, 500, 'abc'), /Friend reward must be between/);
});
test('rejects zero/negative reward amount', () => {
  assert.throws(() => computeReferralSplit(0, 0, 0, 0), /Invalid offer reward amount/);
  assert.throws(() => computeReferralSplit(-100, 0, 0, 0), /Invalid offer reward amount/);
});
test('rejects min > max range', () => {
  assert.throws(() => computeReferralSplit(500, 450, 400, 420), /Invalid min\/max sharing reward range/);
});
test('rounds to 2 decimal places', () => {
  assert.strictEqual(round2(100.005), 100.01);
  const r = computeReferralSplit(100.1, 0, 100.1, 33.333);
  assert.strictEqual(r.friendReward, 33.33);
});

console.log('isValidStatusTransition()');
test('install: Pending -> Success allowed', () => assert.ok(isValidStatusTransition('install', 'Pending', 'Success')));
test('install: Success -> Success allowed (idempotent)', () => assert.ok(isValidStatusTransition('install', 'Success', 'Success')));
test('install: Success -> Pending NOT allowed', () => assert.ok(!isValidStatusTransition('install', 'Success', 'Pending')));
test('kyc: Pending -> Success allowed', () => assert.ok(isValidStatusTransition('kyc', 'Pending', 'Success')));
test('kyc: Success -> Pending NOT allowed', () => assert.ok(!isValidStatusTransition('kyc', 'Success', 'Pending')));
test('payment: Pending -> Paid allowed', () => assert.ok(isValidStatusTransition('payment', 'Pending', 'Paid')));
test('payment: Paid -> Pending NOT allowed (terminal state)', () => assert.ok(!isValidStatusTransition('payment', 'Paid', 'Pending')));

console.log(`\n${passed} tests passed`);
if (process.exitCode) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
}
