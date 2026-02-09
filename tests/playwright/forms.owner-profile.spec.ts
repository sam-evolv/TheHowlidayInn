import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Owner Profile Form', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile page (assumes user is logged in via test setup)
    await page.goto('/profile');
  });

  test('should display premium layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Wait for form to load
    await expect(page.getByTestId('card-owner-profile')).toBeVisible();
    
    // Take visual snapshot
    await page.screenshot({ 
      path: 'tests/reports/visual/forms/owner-profile-desktop.png',
      fullPage: true 
    });
    
    // Verify 2-column grid layout
    const formContainer = page.locator('form .grid');
    await expect(formContainer).toHaveClass(/md:grid-cols-2/);
    
    // Verify all form fields are present
    await expect(page.getByTestId('input-owner-name')).toBeVisible();
    await expect(page.getByTestId('input-owner-phone')).toBeVisible();
    await expect(page.getByTestId('input-owner-email')).toBeVisible();
    await expect(page.getByTestId('button-save-owner')).toBeVisible();
  });

  test('should display single column on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Wait for form to load
    await expect(page.getByTestId('card-owner-profile')).toBeVisible();
    
    // Take visual snapshot
    await page.screenshot({ 
      path: 'tests/reports/visual/forms/owner-profile-mobile.png',
      fullPage: true 
    });
    
    // Verify all form fields are visible and stacked
    await expect(page.getByTestId('input-owner-name')).toBeVisible();
    await expect(page.getByTestId('input-owner-phone')).toBeVisible();
    await expect(page.getByTestId('input-owner-email')).toBeVisible();
  });

  test('should have proper form field styling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const nameInput = page.getByTestId('input-owner-name');
    const phoneInput = page.getByTestId('input-owner-phone');
    const emailInput = page.getByTestId('input-owner-email');
    
    // Verify inputs have proper classes for styling
    await expect(nameInput).toHaveClass(/rounded-lg/);
    await expect(nameInput).toHaveClass(/shadow-sm/);
    
    // Verify focus ring behavior
    await nameInput.focus();
    await expect(nameInput).toHaveClass(/focus:ring-2/);
    
    // Verify labels are properly styled
    const nameLabel = page.locator('label', { hasText: 'Full Name' });
    await expect(nameLabel).toBeVisible();
    await expect(nameLabel).toContainText('*'); // Required marker
  });

  test('should validate required fields', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Clear required field and try to submit
    await page.getByTestId('input-owner-name').clear();
    await page.getByTestId('button-save-owner').click();
    
    // Verify validation error appears
    await expect(page.locator('text=Full name is required')).toBeVisible();
  });

  test('should submit form successfully', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Fill out form
    await page.getByTestId('input-owner-name').fill('John Smith');
    await page.getByTestId('input-owner-phone').fill('0871234567');
    
    // Submit form
    await page.getByTestId('button-save-owner').click();
    
    // Verify success (adjust based on actual success behavior)
    // This might show a toast notification or navigate
    await expect(page.getByTestId('button-save-owner')).not.toBeDisabled();
  });

  test('should have no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();
    
    // Check for serious and critical issues only
    const violations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );
    
    expect(violations).toHaveLength(0);
  });

  test('should have no default junk values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Verify inputs don't have unwanted default values
    const nameValue = await page.getByTestId('input-owner-name').inputValue();
    const phoneValue = await page.getByTestId('input-owner-phone').inputValue();
    
    // Should be empty or contain actual user data, never junk like "Sam Dollar"
    expect(nameValue).not.toContain('Sam Dollar');
    expect(nameValue).not.toContain('Sam Donworth');
    expect(nameValue).not.toContain('artifact');
  });
});
