import { test, expect } from '@playwright/test';

/**
 * Capacity Overview - Defaults Update Test
 * 
 * This test verifies that:
 * 1. Setting defaults via "Update Capacity Settings" button updates the Overview cards instantly
 * 2. The overview shows correct totals after updating defaults
 * 3. No page reload is required - updates happen via query invalidation
 */

test.describe('Capacity Overview - Defaults Update', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-admin-password"]', 'admin123');
    await page.click('[data-testid="button-admin-login"]');
    
    // Wait for redirect to admin page
    await page.waitForURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should update Overview instantly when capacity defaults are changed', async ({ page }) => {
    // Step 1: Navigate to admin dashboard (already there from beforeEach)
    
    // Step 2: Set defaults: daycare=10, boardingSmall=10, boardingLarge=8, trial=10
    await page.click('[data-testid="button-edit-defaults"]');
    
    await page.fill('[data-testid="input-default-daycare"]', '10');
    await page.fill('[data-testid="input-default-boarding-small"]', '10');
    await page.fill('[data-testid="input-default-boarding-large"]', '8');
    await page.fill('[data-testid="input-default-trial"]', '10');
    
    await page.click('[data-testid="button-save-defaults"]');
    
    // Wait for success toast
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Step 3: Verify Overview cards show correct values
    // Total capacity should be: 10 (daycare) + 18 (boarding: 10+8) + 10 (trial) = 38
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('38', { timeout: 5000 });
    
    // Step 4: Verify service breakdown
    // Daycare: 10/10 available
    const daycareCard = page.locator('[data-testid="capacity-card-daycare"]');
    await expect(daycareCard.locator('text=10 of 10 spots available')).toBeVisible();
    
    // Boarding: 18/18 available (aggregate of small=10 + large=8)
    const boardingCard = page.locator('[data-testid="capacity-card-boarding"]');
    await expect(boardingCard.locator('text=18 of 18 spots available')).toBeVisible();
    
    // Trial: 10/10 available
    const trialCard = page.locator('[data-testid="capacity-card-trial"]');
    await expect(trialCard.locator('text=10 of 10 spots available')).toBeVisible();
  });

  test('should update Overview with different defaults and show correct aggregate', async ({ page }) => {
    // Set different defaults: daycare=15, boardingSmall=12, boardingLarge=6, trial=8
    await page.click('[data-testid="button-edit-defaults"]');
    
    await page.fill('[data-testid="input-default-daycare"]', '15');
    await page.fill('[data-testid="input-default-boarding-small"]', '12');
    await page.fill('[data-testid="input-default-boarding-large"]', '6');
    await page.fill('[data-testid="input-default-trial"]', '8');
    
    await page.click('[data-testid="button-save-defaults"]');
    
    // Wait for success
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify totals: 15 + 18 (12+6) + 8 = 41
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('41', { timeout: 5000 });
    
    // Verify individual services
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=15 of 15 spots available')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-card-boarding"]').locator('text=18 of 18 spots available')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-card-trial"]').locator('text=8 of 8 spots available')).toBeVisible();
  });

  test('should show loading state and not require page reload', async ({ page }) => {
    // Edit defaults
    await page.click('[data-testid="button-edit-defaults"]');
    await page.fill('[data-testid="input-default-daycare"]', '20');
    
    // Click save and verify button shows loading state
    await page.click('[data-testid="button-save-defaults"]');
    await expect(page.locator('[data-testid="button-save-defaults"]')).toHaveText('Updating...');
    
    // Wait for completion
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify the button text returns to normal
    await expect(page.locator('[data-testid="button-edit-defaults"]')).toBeVisible();
    
    // Verify Overview updated without reload (check if still on same page)
    await expect(page).toHaveURL('/admin');
  });
});
