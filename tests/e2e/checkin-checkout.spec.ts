import { test, expect } from '@playwright/test';

test.describe('StayDesk ERP - Core Guest Check-In & Check-Out Integration Flow', () => {
  test('Should successfully perform a complete guest stay lifecycle', async ({ page }) => {
    // 1. Visit Login screen
    await page.goto('/login');
    await expect(page).toHaveTitle(/StayDesk/);

    // 2. Perform Login
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 3. Confirm Dashboard Redirect
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('StayDesk');

    // 4. Navigate to Check-In wizard
    await page.goto('/check-in');
    await page.waitForSelector('h1:has-text("Check-In")');

    // 5. Select or Register Customer
    await page.fill('input[placeholder*="search"]', '9876543210');
    
    // Simulate clicking search or new customer form if not found
    const newCustButton = page.locator('button:has-text("New Guest")');
    if (await newCustButton.isVisible()) {
      await newCustButton.click();
      await page.fill('input[name="full_name"]', 'Test E2E Guest');
      await page.fill('input[name="phone"]', '9876543210');
      await page.selectOption('select[name="gender"]', 'Male');
      await page.fill('textarea[name="address"]', 'E2E Test Street');
      await page.selectOption('select[name="state"]', 'Goa');
      await page.selectOption('select[name="city"]', 'Panaji');
      await page.click('button:has-text("Save Guest")');
    }

    // 6. Fill Check-In Parameters
    await page.selectOption('select[name="room_id"]', { index: 1 }); // pick first available room
    await page.fill('input[name="advance_paid"]', '1000');
    await page.click('button:has-text("Confirm Check-In")');

    // 7. Verify Occupied state on Dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('.bg-red-50')).toBeVisible();

    // 8. Go to Check-Out Page and checkout
    await page.goto('/check-out');
    await page.waitForSelector('h1:has-text("Active Stays")');
    
    // Find the guest and click View Details
    await page.click('button:has-text("View Details")');
    
    // Settle balance and check-out
    await page.click('button:has-text("Settle & Check-Out")');
    
    // Verify room returns to Ready state
    await page.goto('/dashboard');
    await expect(page.locator('.bg-green-50')).toBeVisible();
  });
});
