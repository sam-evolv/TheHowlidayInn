import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'iPhone SE', width: 320, height: 640 },
  { name: 'iPhone 14 Pro', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'Surface Pro', width: 1280, height: 800 },
  { name: 'MacBook', width: 1440, height: 900 },
  { name: 'Desktop HD', width: 1920, height: 1080 },
];

test.describe('Responsive design tests', () => {
  for (const viewport of viewports) {
    test(`Home page renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Verify key elements are visible
      await expect(page.getByRole('heading', { name: /howliday/i }).first()).toBeVisible();
      
      // Navigation should be accessible (either visible or in hamburger menu)
      const navVisible = await page.getByRole('navigation').isVisible().catch(() => false);
      const menuButtonVisible = await page.getByRole('button', { name: /menu/i }).isVisible().catch(() => false);
      expect(navVisible || menuButtonVisible).toBeTruthy();
      
      // Take screenshot for visual regression
      await page.screenshot({
        path: `tests/reports/screenshots/home-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
    });

    test(`Services page renders correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/services');
      
      // Verify service cards are visible
      await expect(page.getByText(/daycare|boarding/i).first()).toBeVisible();
      
      await page.screenshot({
        path: `tests/reports/screenshots/services-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
    });

    test(`Booking forms are usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/daycare');
      
      // Verify form fields are visible and interactable
      await expect(page.getByTestId('input-owner-name')).toBeVisible();
      await expect(page.getByTestId('input-email')).toBeVisible();
      await expect(page.getByTestId('input-dog-name')).toBeVisible();
      
      // Verify submit button is visible
      await expect(page.getByTestId('button-submit')).toBeVisible();
      
      await page.screenshot({
        path: `tests/reports/screenshots/daycare-form-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
    });
  }
});
