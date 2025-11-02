import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../fixtures/test-users';

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
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('should display login form elements', async ({ page }) => {
    // Verify all form elements are present
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click login button without filling the form
    await page.getByRole('button', { name: /log in/i }).click();

    // Verify validation messages appear
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.getByLabel(/email/i).fill(TEST_USERS.invalidUser.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.invalidUser.password);

    // Submit the form
    await page.getByRole('button', { name: /log in/i }).click();

    // Verify error message is displayed
    await expect(page.getByText(/invalid (login credentials|email or password)/i)).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill form with valid credentials
    await page.getByLabel(/email/i).fill(TEST_USERS.validUser.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.validUser.password);

    // Submit the form
    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for navigation to complete
    await page.waitForURL('/projects', { timeout: 10000 });

    // Verify we're on the projects page
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  });

  test('should redirect to projects page if already logged in', async ({ page }) => {
    // First, login
    await page.getByLabel(/email/i).fill(TEST_USERS.validUser.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.validUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/projects');

    // Try to navigate back to login
    await page.goto('/login');

    // Should redirect back to projects
    await expect(page).toHaveURL('/projects');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    const toggleButton = page.getByRole('button', {
      name: /show password|hide password|toggle password visibility/i,
    });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have link to signup page', async ({ page }) => {
    // Find and click the signup link
    const signupLink = page.getByRole('link', { name: /sign up|register/i });
    await expect(signupLink).toBeVisible();

    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('should have link to password reset page', async ({ page }) => {
    // Find and click the forgot password link
    const forgotPasswordLink = page.getByRole('link', {
      name: /forgot password/i,
    });
    await expect(forgotPasswordLink).toBeVisible();

    await forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/reset-password|\/forgot-password/);
  });
});
