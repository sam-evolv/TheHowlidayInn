import { test, expect } from '@playwright/test';

test.describe('Trial Day booking flow', () => {
  test('complete trial day booking with fixed €20 price', async ({ page }) => {
    await page.goto('/trial');
    await expect(page).toHaveURL(/\/trial$/);
    
    // Verify page loaded
    await expect(page.getByRole('heading', { name: /trial/i })).toBeVisible();
    
    // Verify fixed price is displayed (€20)
    await expect(page.getByText(/€20|20€/i)).toBeVisible();
    
    // Fill out booking form
    const testEmail = `trial-test-${Date.now()}@example.com`;
    const testDogName = `TrialDog${Date.now()}`;
    
    // Owner information
    await page.getByTestId('input-owner-name').fill('Trial Test Owner');
    await page.getByTestId('input-email').fill(testEmail);
    await page.getByTestId('input-phone').fill('0873333333');
    
    // Dog information
    await page.getByTestId('input-dog-name').fill(testDogName);
    await page.getByTestId('input-breed').fill('Poodle');
    
    // Select gender
    const genderSelect = page.locator('[name="gender"], [data-testid*="gender"]').first();
    await genderSelect.click();
    await page.getByRole('option', { name: /male/i }).click();
    
    // Age and weight
    await page.getByTestId('input-age').fill('2');
    await page.getByTestId('input-weight').fill('15');
    
    // Select trial date (3 days from now)
    const trialDate = new Date();
    trialDate.setDate(trialDate.getDate() + 3);
    const dateInput = page.getByTestId('input-trial-date');
    await dateInput.fill(trialDate.toISOString().split('T')[0]);
    
    // Select time
    const dropoffSelect = page.locator('[name="dropoffTime"], [data-testid*="dropoff"]').first();
    await dropoffSelect.click();
    await page.getByRole('option', { name: /9:00|10:00/i }).first().click();
    
    // Emergency contact
    await page.getByTestId('input-emergency-name').fill('Trial Emergency Contact');
    await page.getByTestId('input-emergency-phone').fill('0874444444');
    
    // Vaccination info
    await page.getByTestId('input-vaccination-type').fill('Annual Vaccination');
    await page.getByTestId('input-vaccination-date').fill('2024-03-01');
    
    // Verify fixed €20 price is still shown
    await expect(page.getByText(/€20|20€/i)).toBeVisible();
    
    // Submit form
    await page.getByTestId('button-submit').click();
    
    // Wait for Stripe checkout redirect
    await page.waitForURL(/checkout\.stripe\.com|stripe/i, { timeout: 10000 });
    
    // Fill in Stripe test card details
    await page.waitForTimeout(3000);
    
    const cardNumberFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    await cardNumberFrame.locator('[name="number"]').fill('4242424242424242');
    await cardNumberFrame.locator('[name="expiry"]').fill('12/34');
    await cardNumberFrame.locator('[name="cvc"]').fill('123');
    await page.locator('[name="name"]').fill('Test Customer').catch(() => {});
    
    // Submit payment
    await page.getByRole('button', { name: /pay|submit/i }).click();
    
    // Wait for redirect to success page
    await page.waitForURL(/success/, { timeout: 15000 });
    
    // Verify success page
    await expect(page.getByText(/success|confirmed|booking/i)).toBeVisible();
    await expect(page.getByText(/view.*account|my.*bookings/i)).toBeVisible();
    
    // TODO: Verify fixed €20 charge in admin dashboard
    // TODO: Verify email confirmation sent
  });

  test('trial day form validation', async ({ page }) => {
    await page.goto('/trial');
    
    // Try to submit empty form
    await page.getByTestId('button-submit').click();
    
    // Should show validation errors
    await expect(page.getByText(/required|must be|invalid/i).first()).toBeVisible({ timeout: 3000 });
  });
});
