import { expect, test } from '@playwright/test';

/**
 * Signup E2E Tests
 *
 * Tests the user registration flow including:
 * - Form validation
 * - Successful registration
 * - Email verification flow
 * - Error handling
 */

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page before each test
    await page.goto('/signup');
  });

  test('should display signup form elements', async ({ page }) => {
    // Verify all form elements are present
    await expect(page.getByRole('heading', { name: /sign up|register/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password|password confirmation/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|register/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click signup button without filling the form
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify validation messages appear
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/^password/i).fill('ValidPassword123!');
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify email format validation
    await expect(page.getByText(/invalid email|valid email/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    // Enter weak password
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password/i).fill('weak');
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify password strength validation
    await expect(page.getByText(/password must be|password should|at least \d+ characters/i)).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    // Enter non-matching passwords
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password/i).fill('ValidPassword123!');
    await page.getByLabel(/confirm password|password confirmation/i).fill('DifferentPassword123!');
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify password match validation
    await expect(page.getByText(/passwords (do not|must) match/i)).toBeVisible();
  });

  test('should show success message and email verification notice', async ({ page }) => {
    // Generate unique email for this test
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // Fill form with valid data
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/^password/i).fill('ValidPassword123!');
    await page.getByLabel(/confirm password|password confirmation/i).fill('ValidPassword123!');

    // Submit the form
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify success message
    await expect(page.getByText(/check your email|verification email|confirm your email/i)).toBeVisible();
  });

  test('should show error for already registered email', async ({ page }) => {
    // This test requires an existing user in the test database
    // Using the same email from TEST_USERS
    const existingEmail = 'test@example.com';

    // Fill form with existing email
    await page.getByLabel(/email/i).fill(existingEmail);
    await page.getByLabel(/^password/i).fill('ValidPassword123!');
    await page.getByLabel(/confirm password|password confirmation/i).fill('ValidPassword123!');

    // Submit the form
    await page.getByRole('button', { name: /sign up|register/i }).click();

    // Verify error message for duplicate email
    await expect(page.getByText(/email (already|is) (exists|registered|taken)/i)).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    // Find and click the login link
    const loginLink = page.getByRole('link', { name: /log in|sign in/i });
    await expect(loginLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('should toggle password visibility for both password fields', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password/i);
    const confirmPasswordInput = page.getByLabel(/confirm password|password confirmation/i);

    // Get toggle buttons (there should be two)
    const toggleButtons = page.getByRole('button', {
      name: /show password|hide password|toggle password visibility/i,
    });

    // Initially both passwords should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Click first toggle to show password
    await toggleButtons.first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click second toggle to show confirm password
    await toggleButtons.last().click();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });
});
