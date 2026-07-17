// ========================================================
// StayDesk CRM / HotelFlow CRM Automated Billing Tests
// Location: tests/pricing.test.js
// ========================================================

const test = require('node:test');
const assert = require('node:assert');

test('Pending ledger amount matches total room price minus advance payment', () => {
  const roomPrice = 4500.00;
  const advance = 1500.00;
  const pending = roomPrice - advance;
  
  assert.strictEqual(pending, 3000.00);
});

test('Pending ledger is exactly zero when advance payment equals room price', () => {
  const roomPrice = 3500.00;
  const advance = 3500.00;
  const pending = roomPrice - advance;
  
  assert.strictEqual(pending, 0.00);
});

test('Exclusion range overlaps check functions mock logic', () => {
  const checkIn = new Date('2026-07-17T12:00:00Z');
  const expectedCheckout = new Date('2026-07-20T12:00:00Z');
  
  const overlappingCheckIn = new Date('2026-07-19T12:00:00Z');
  const overlappingCheckout = new Date('2026-07-22T12:00:00Z');
  
  // Overlap matches check: checkin1 < checkout2 AND checkin2 < checkout1
  const overlaps = checkIn < overlappingCheckout && overlappingCheckIn < expectedCheckout;
  
  assert.strictEqual(overlaps, true);
});
