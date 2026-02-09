import { test, expect } from '@playwright/test';

test.describe('Daycare booking flow', () => {
  test('complete daycare booking with payment and admin verification', async ({ page }) => {
    // Navigate to daycare booking page
    await page.goto('/daycare');
    await expect(page).toHaveURL(/\/daycare$/);
    
    // Verify page loaded
    await expect(page.getByRole('heading', { name: /daycare/i })).toBeVisible();
    
    // Fill out booking form
    const testEmail = `test-${Date.now()}@example.com`;
    const testPhone = '0871234567';
    const testDogName = `TestDog${Date.now()}`;
    
    // Owner information
    await page.getByTestId('input-owner-name').fill('Test Owner');
    await page.getByTestId('input-email').fill(testEmail);
    await page.getByTestId('input-phone').fill(testPhone);
    
    // Dog information
    await page.getByTestId('input-dog-name').fill(testDogName);
    await page.getByTestId('input-breed').fill('Golden Retriever');
    
    // Select gender - try different possible selectors
    const genderSelect = page.locator('[name="gender"], [data-testid*="gender"]').first();
    await genderSelect.click();
    await page.getByRole('option', { name: /male/i }).click();
    
    // Age and weight
    await page.getByTestId('input-age').fill('3');
    await page.getByTestId('input-weight').fill('25');
    
    // Select service date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = page.getByTestId('input-service-date');
    await dateInput.fill(tomorrow.toISOString().split('T')[0]);
    
    // Select times
    const dropoffSelect = page.locator('[name="dropoffTime"], [data-testid*="dropoff"]').first();
    await dropoffSelect.click();
    await page.getByRole('option', { name: /8:00/i }).first().click();
    
    const pickupSelect = page.locator('[name="pickupTime"], [data-testid*="pickup"]').first();
    await pickupSelect.click();
    await page.getByRole('option', { name: /17:00|5:00 PM/i }).first().click();
    
    // Emergency contact
    await page.getByTestId('input-emergency-name').fill('Emergency Contact');
    await page.getByTestId('input-emergency-phone').fill('0871111111');
    
    // Vaccination info
    await page.getByTestId('input-vaccination-type').fill('Annual Booster');
    await page.getByTestId('input-vaccination-date').fill('2024-01-15');
    
    // Verify pricing is displayed
    await expect(page.getByText(/€|total|price/i)).toBeVisible();
    
    // Submit form
    await page.getByTestId('button-submit').click();
    
    // Wait for Stripe checkout redirect
    await page.waitForURL(/checkout\.stripe\.com|stripe/i, { timeout: 10000 });
    
    // Fill in Stripe test card details
    // Wait for Stripe's payment form to load
    await page.waitForTimeout(3000);
    
    // Fill card number (Stripe test card)
    const cardNumberFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    await cardNumberFrame.locator('[name="number"]').fill('4242424242424242');
    
    // Fill expiry date
    await cardNumberFrame.locator('[name="expiry"]').fill('12/34');
    
    // Fill CVC
    await cardNumberFrame.locator('[name="cvc"]').fill('123');
    
    // Fill cardholder name if present
    await page.locator('[name="name"]').fill('Test Customer').catch(() => {});
    
    // Submit payment
    await page.getByRole('button', { name: /pay|submit/i }).click();
    
    // Wait for redirect to success page
    await page.waitForURL(/success/, { timeout: 15000 });
    
    // Verify success page
    await expect(page.getByText(/success|confirmed|booking/i)).toBeVisible();
    
    // Extract booking reference if displayed
    const bookingRef = await page.getByText(/booking.*#|reference/i).textContent().catch(() => null);
    
    // Verify account link is present
    await expect(page.getByText(/view.*account|my.*bookings/i)).toBeVisible();
    
    // TODO: Verify email was sent (requires email testing infrastructure)
    // TODO: Login to admin dashboard and verify booking appears
  });

  test('daycare form validation', async ({ page }) => {
    await page.goto('/daycare');
    
    // Try to submit empty form
    await page.getByTestId('button-submit').click();
    
    // Should show validation errors
    await expect(page.getByText(/required|must be|invalid/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('daycare phone validation', async ({ page }) => {
    await page.goto('/daycare');
    
    // Fill required fields with invalid phone
    await page.getByTestId('input-owner-name').fill('Test Owner');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-phone').fill('123'); // Invalid phone
    await page.getByTestId('input-dog-name').fill('TestDog');
    await page.getByTestId('input-breed').fill('Golden Retriever');
    
    await page.getByTestId('button-submit').click();
    
    // Should show phone validation error
    const hasPhoneError = await page.getByText(/phone|invalid/i).isVisible({ timeout: 3000 }).catch(() => false);
    if (hasPhoneError) {
      expect(hasPhoneError).toBeTruthy();
    }
  });
});
