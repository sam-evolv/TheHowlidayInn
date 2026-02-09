import { test, expect } from '@playwright/test';

/**
 * Capacity Overview - Overrides Test
 * 
 * This test verifies that:
 * 1. Creating date-specific overrides updates the Overview instantly for that date
 * 2. The Overview correctly shows override values vs defaults
 * 3. Changing dates in the DatePicker updates Overview to show correct values
 * 4. Boarding aggregate correctly sums boarding:small + boarding:large overrides
 */

test.describe('Capacity Overview - Overrides', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-admin-password"]', 'admin123');
    await page.click('[data-testid="button-admin-login"]');
    
    // Wait for redirect to admin page
    await page.waitForURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();

    // Reset to known defaults first
    await page.click('[data-testid="button-edit-defaults"]');
    await page.fill('[data-testid="input-default-daycare"]', '10');
    await page.fill('[data-testid="input-default-boarding-small"]', '10');
    await page.fill('[data-testid="input-default-boarding-large"]', '8');
    await page.fill('[data-testid="input-default-trial"]', '10');
    await page.click('[data-testid="button-save-defaults"]');
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });

    // Clear any existing overrides
    const resetButton = page.locator('[data-testid="button-reset-all-overrides"]');
    const isVisible = await resetButton.isVisible().catch(() => false);
    if (isVisible) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show override values in Overview for specific date', async ({ page }) => {
    // Get tomorrow's date for the override
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Create overrides for tomorrow: daycare=12, boarding small=7, boarding large=6, trial=5
    // Daycare override
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Daycare');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '12');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Boarding Small override
    await page.selectOption('[data-testid="select-override-service"]', 'Boarding Small');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '7');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Boarding Large override
    await page.selectOption('[data-testid="select-override-service"]', 'Boarding Large');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '6');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Trial Day override
    await page.selectOption('[data-testid="select-override-service"]', 'Trial Day');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '5');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Change Overview date to tomorrow
    await page.fill('[data-testid="input-capacity-date"]', tomorrowStr);
    await page.waitForTimeout(1000); // Wait for query to refetch

    // Verify Overview shows override values
    // Daycare: 12
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=12 of 12 spots available')).toBeVisible();
    
    // Boarding: 13 (7+6)
    await expect(page.locator('[data-testid="capacity-card-boarding"]').locator('text=13 of 13 spots available')).toBeVisible();
    
    // Trial: 5
    await expect(page.locator('[data-testid="capacity-card-trial"]').locator('text=5 of 5 spots available')).toBeVisible();
    
    // Total: 12 + 13 + 5 = 30
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('30');
  });

  test('should revert to defaults when date without overrides is selected', async ({ page }) => {
    // Get tomorrow's date for override
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Create override for tomorrow only
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Daycare');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '20');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Set Overview to tomorrow - should show override
    await page.fill('[data-testid="input-capacity-date"]', tomorrowStr);
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=20 of 20 spots available')).toBeVisible();

    // Set Overview to today - should show defaults
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="input-capacity-date"]', today);
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=10 of 10 spots available')).toBeVisible();
  });

  test('should update Overview when overrides are deleted', async ({ page }) => {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Create override
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Daycare');
    await page.fill('[data-testid="input-override-single-date"]', tomorrowStr);
    await page.fill('[data-testid="input-override-capacity"]', '25');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });

    // Set Overview to tomorrow
    await page.fill('[data-testid="input-capacity-date"]', tomorrowStr);
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=25 of 25 spots available')).toBeVisible();

    // Delete the override
    await page.click('[data-testid="button-delete-override-0"]');
    await page.waitForTimeout(500);

    // Verify Overview reverts to defaults
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=10 of 10 spots available')).toBeVisible();
  });
});
