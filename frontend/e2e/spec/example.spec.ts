import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/POD Team Management/);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Login');
});

test('navigation sidebar renders', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
});
