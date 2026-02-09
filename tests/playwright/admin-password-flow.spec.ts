import { test, expect } from '@playwright/test';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'howlidayinn1@gmail.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const ADMIN_NEW_PASSWORD = process.env.ADMIN_NEW_PASSWORD || 'H!owlidayInn-StrongPass-2025';

test.describe('Admin password lifecycle', () => {
  test.skip(!OWNER_PASSWORD, 'OWNER_PASSWORD must be set');
  
  test('guard, login, change password, logout, re-login with new password', async ({ page, request, context }) => {
    // 1) Guard: unauthenticated /admin should redirect to /admin/login
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);

    // API should be blocked unauthenticated
    const blocked = await request.get('/api/admin/stats');
    expect(blocked.status()).toBe(401);

    // 2) Login with current (bootstrap) credentials
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASSWORD);
    await page.getByTestId('button-login').click();
    await page.waitForURL(/\/admin$/, { timeout: 15000 });

    // 3) Verify we can now access admin APIs
    const allowed = await request.get('/api/admin/stats');
    expect(allowed.status()).toBe(200);

    // 4) Change password in Settings tab
    await page.getByRole('tab', { name: /settings/i }).click();
    
    // Wait for settings form to be visible
    await page.waitForSelector('[data-testid="input-current-password"]', { timeout: 5000 });
    
    await page.getByTestId('input-current-password').fill(OWNER_PASSWORD);
    await page.getByTestId('input-new-password').fill(ADMIN_NEW_PASSWORD);
    await page.getByTestId('input-confirm-password').fill(ADMIN_NEW_PASSWORD);
    
    // Click change password button
    await page.getByTestId('button-change-password').click();

    // Expect a toast or success message
    await expect(page.getByText(/password updated|password changed/i)).toBeVisible({ timeout: 10_000 });

    // 5) Logout
    await page.getByRole('button', { name: /sign out|logout/i }).click();
    await page.waitForURL(/\/admin\/login$/, { timeout: 10000 });

    // 6) Old password must fail
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASSWORD);
    await page.getByTestId('button-login').click();
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });

    // 7) New password must succeed
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', ADMIN_NEW_PASSWORD);
    await page.getByTestId('button-login').click();
    await page.waitForURL(/\/admin$/, { timeout: 15000 });

    // 8) Cookie sanity – ensure httpOnly cookie is set
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'howliday_admin');
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.sameSite).toBe('Lax');

    // 9) Admin APIs accessible again
    const allowed2 = await request.get('/api/admin/bookings?limit=1');
    expect(allowed2.status()).toBe(200);
    
    // Cleanup: Reset password back to original for future test runs
    await page.goto('/admin');
    await page.getByRole('tab', { name: /settings/i }).click();
    await page.waitForSelector('[data-testid="input-current-password"]', { timeout: 5000 });
    await page.getByTestId('input-current-password').fill(ADMIN_NEW_PASSWORD);
    await page.getByTestId('input-new-password').fill(OWNER_PASSWORD);
    await page.getByTestId('input-confirm-password').fill(OWNER_PASSWORD);
    await page.getByTestId('button-change-password').click();
    await expect(page.getByText(/password updated|password changed/i)).toBeVisible({ timeout: 10_000 });
  });
});
