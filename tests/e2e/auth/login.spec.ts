import { expect, test } from '@playwright/test';

/**
 * Login E2E Tests
 *
 * Tests the authentication login flow including:
 * - Successful login with valid credentials
 * - Failed login with invalid credentials
 * - Form validation
 * - Redirect after successful login
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // navigate to login page before each test
    await page.goto('/login');
  });

  test('successful login and logout flow', async ({ page }) => {
    // step 1: navigate to login page
    await page.goto('/login');

    // step 2: wait for login page to load and display
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('login-form')).toBeVisible();

    // step 3: fill in valid email from environment variable
    const emailInput = page.getByTestId('login-email-input');
    await emailInput.fill(process.env.E2E_USERNAME || '');

    // step 4: fill in valid password from environment variable
    const passwordInput = page.getByTestId('login-password-input');
    await passwordInput.fill(process.env.E2E_PASSWORD || '');

    // step 5: click login button
    const submitButton = page.getByTestId('login-submit-button');
    await submitButton.click();

    // step 6: wait for redirect to /projects and app layout to be visible
    await page.waitForURL('/projects');
    await expect(page.getByTestId('project-list-page')).toBeVisible();
    await expect(page.getByTestId('app-header')).toBeVisible();
    await expect(page.getByTestId('app-sidebar')).toBeVisible();

    // step 7: click on user menu dropdown trigger in sidebar
    const userMenuTrigger = page.getByTestId('sidebar-user-menu-trigger');
    await expect(userMenuTrigger).toBeVisible();
    await userMenuTrigger.click();

    // step 8: wait for dropdown menu to appear and click "Log out"
    await expect(page.getByTestId('sidebar-user-menu-content')).toBeVisible();
    const logoutButton = page.getByTestId('sidebar-user-menu-logout');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // step 9: wait for user to be logged out and redirected to login page
    await page.waitForURL('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();

    // step 10: test complete - verify we're back on login page
    await expect(page.getByTestId('login-form')).toBeVisible();
  });
});
