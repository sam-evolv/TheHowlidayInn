import { test, expect } from '@playwright/test';

/**
 * Capacity Overview - Refresh Behavior Test
 * 
 * This test verifies that:
 * 1. Overview updates instantly after PUT /api/capacity/defaults without page reload
 * 2. Overview updates instantly after override CRUD operations without page reload
 * 3. Query invalidation works correctly
 * 4. No manual page refresh is needed
 */

test.describe('Capacity Overview - Refresh Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-admin-password"]', 'admin123');
    await page.click('[data-testid="button-admin-login"]');
    
    // Wait for redirect to admin page
    await page.waitForURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();

    // Set known defaults
    await page.click('[data-testid="button-edit-defaults"]');
    await page.fill('[data-testid="input-default-daycare"]', '10');
    await page.fill('[data-testid="input-default-boarding-small"]', '10');
    await page.fill('[data-testid="input-default-boarding-large"]', '8');
    await page.fill('[data-testid="input-default-trial"]', '10');
    await page.click('[data-testid="button-save-defaults"]');
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should invalidate Overview query after updating defaults', async ({ page }) => {
    // Verify initial state
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('38');
    
    // Update defaults
    await page.click('[data-testid="button-edit-defaults"]');
    await page.fill('[data-testid="input-default-daycare"]', '20');
    await page.fill('[data-testid="input-default-boarding-small"]', '15');
    await page.fill('[data-testid="input-default-boarding-large"]', '12');
    await page.fill('[data-testid="input-default-trial"]', '8');
    await page.click('[data-testid="button-save-defaults"]');
    
    // Wait for success
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify Overview updated instantly without reload
    // New total: 20 + 27 (15+12) + 8 = 55
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('55', { timeout: 3000 });
    
    // Verify still on same page (no reload)
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should invalidate Overview query after creating override', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Verify initial state
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=10 of 10 spots available')).toBeVisible();
    
    // Create override for today
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Daycare');
    await page.fill('[data-testid="input-override-single-date"]', today);
    await page.fill('[data-testid="input-override-capacity"]', '30');
    await page.click('[data-testid="button-create-override"]');
    
    // Wait for success
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify Overview updated instantly without reload
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=30 of 30 spots available')).toBeVisible({ timeout: 3000 });
    
    // Verify no page reload occurred
    await expect(page).toHaveURL('/admin');
  });

  test('should invalidate Overview query after deleting override', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create override
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Daycare');
    await page.fill('[data-testid="input-override-single-date"]', today);
    await page.fill('[data-testid="input-override-capacity"]', '25');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify override is active
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=25 of 25 spots available')).toBeVisible();
    
    // Delete override
    await page.click('[data-testid="button-delete-override-0"]');
    await page.waitForTimeout(500);
    
    // Verify Overview reverted to defaults instantly without reload
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=10 of 10 spots available')).toBeVisible({ timeout: 3000 });
    
    // Verify no page reload
    await expect(page).toHaveURL('/admin');
  });

  test('should invalidate Overview query after resetting all overrides', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create multiple overrides
    const services = ['Daycare', 'Boarding Small', 'Trial Day'];
    const capacities = ['20', '15', '5'];
    
    for (let i = 0; i < services.length; i++) {
      await page.click('[data-testid="button-mode-single"]');
      await page.selectOption('[data-testid="select-override-service"]', services[i]);
      await page.fill('[data-testid="input-override-single-date"]', today);
      await page.fill('[data-testid="input-override-capacity"]', capacities[i]);
      await page.click('[data-testid="button-create-override"]');
      await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });
    }
    
    // Verify overrides are active
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=20 of 20 spots available')).toBeVisible();
    
    // Reset all overrides
    await page.click('[data-testid="button-reset-all-overrides"]');
    await page.waitForTimeout(500);
    
    // Verify Overview reverted to defaults instantly without reload
    await expect(page.locator('[data-testid="capacity-card-daycare"]').locator('text=10 of 10 spots available')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="capacity-card-trial"]').locator('text=10 of 10 spots available')).toBeVisible({ timeout: 3000 });
    
    // Verify no page reload
    await expect(page).toHaveURL('/admin');
  });

  test('should update totals correctly across multiple operations', async ({ page }) => {
    // Initial totals: 38 (10 + 18 + 10)
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('38');
    
    // Update defaults to increase capacity
    await page.click('[data-testid="button-edit-defaults"]');
    await page.fill('[data-testid="input-default-daycare"]', '15');
    await page.click('[data-testid="button-save-defaults"]');
    await expect(page.locator('text=Capacity defaults updated successfully')).toBeVisible({ timeout: 5000 });
    
    // New totals: 43 (15 + 18 + 10)
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('43', { timeout: 3000 });
    
    // Create override for today to further increase
    const today = new Date().toISOString().split('T')[0];
    await page.click('[data-testid="button-mode-single"]');
    await page.selectOption('[data-testid="select-override-service"]', 'Trial Day');
    await page.fill('[data-testid="input-override-single-date"]', today);
    await page.fill('[data-testid="input-override-capacity"]', '20');
    await page.click('[data-testid="button-create-override"]');
    await expect(page.locator('text=Capacity override created successfully')).toBeVisible({ timeout: 5000 });
    
    // New totals: 53 (15 + 18 + 20)
    await expect(page.locator('[data-testid="total-capacity"]')).toHaveText('53', { timeout: 3000 });
    
    // Verify all changes happened without page reload
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });
});
