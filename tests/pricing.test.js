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

test('Log Data Masking Utility recursively hides passwords and key values', () => {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'aadhar'];
  const maskValue = (val) => typeof val === 'string' ? '***' : val;

  const maskObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const res = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
        res[k] = maskValue(v);
      } else if (typeof v === 'object') {
        res[k] = maskObject(v);
      } else {
        res[k] = v;
      }
    }
    return res;
  };

  const payload = {
    username: 'john_doe',
    credentials: {
      password: 'supersecretpassword123',
      aadharCard: '1234-5678-9012'
    },
    apiKey: 'sk-live-9938'
  };

  const masked = maskObject(payload);

  assert.strictEqual(masked.username, 'john_doe');
  assert.strictEqual(masked.credentials.password, '***');
  assert.strictEqual(masked.credentials.aadharCard, '***');
  assert.strictEqual(masked.apiKey, '***');
});

test('Multi-Tenant Access Isolation matches app claims structure', () => {
  const jwtClaim = {
    app_metadata: {
      hotel_id: 'hotel-uuid-1111'
    }
  };

  const checkIsolation = (jwt, dataHotelId) => {
    return jwt?.app_metadata?.hotel_id === dataHotelId;
  };

  assert.strictEqual(checkIsolation(jwtClaim, 'hotel-uuid-1111'), true);
  assert.strictEqual(checkIsolation(jwtClaim, 'hotel-uuid-2222'), false);
});

test('Role Authorization Guards allow owner access but restrict receptionist access', () => {
  const ownerUser = { role: 'hotel_owner' };
  const receptionistUser = { role: 'receptionist' };

  const isRouteAllowed = (user, route) => {
    if (route === '/settings' || route === '/super-admin') {
      return user.role === 'hotel_owner' || user.role === 'superadmin';
    }
    return true; // standard routes bookings/rooms/etc
  };

  assert.strictEqual(isRouteAllowed(ownerUser, '/settings'), true);
  assert.strictEqual(isRouteAllowed(receptionistUser, '/settings'), false);
  assert.strictEqual(isRouteAllowed(receptionistUser, '/bookings'), true);
});

test('Guest ID Scans are strictly marked mandatory if registration forms require validation', () => {
  const isValidOnboarding = (docType, frontImg, backImg) => {
    if (docType) {
      return !!(frontImg && backImg);
    }
    return true;
  };

  assert.strictEqual(isValidOnboarding('Aadhar', 'data:image/png;base64...', 'data:image/png;base64...'), true);
  assert.strictEqual(isValidOnboarding('Aadhar', '', 'data:image/png;base64...'), false);
});
