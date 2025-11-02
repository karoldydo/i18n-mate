import { expect, test as setup } from '@playwright/test';

import { LoginPage } from './e2e/pages/auth/LoginPage';
import { ProtectedPage } from './e2e/pages/auth/ProtectedPage';

/**
 * Authentication Setup
 *
 * Performs login before tests and saves authentication state.
 * This setup runs once and provides authenticated session for all tests
 * except authentication-related tests (login, register, reset password).
 *
 * Storage state is saved to .auth/user.json and reused by test projects.
 */

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  // validate required environment variables
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing required environment variables: E2E_USERNAME and E2E_PASSWORD are required for authentication setup.'
    );
  }

  // perform login using page object model
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.waitForLoad();

  // fill in credentials and submit
  await loginPage.login(username, password);

  // wait for successful login redirect to /projects
  await page.waitForURL('/projects');

  // verify authentication succeeded by checking protected layout
  const protectedPage = new ProtectedPage(page);
  await protectedPage.waitForLoad();
  await expect(protectedPage.header).toBeVisible();
  await expect(protectedPage.navigation).toBeVisible();

  // save authentication state to file
  await page.context().storageState({ path: authFile });
});
