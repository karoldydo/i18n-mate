import type { Locator, Page } from '@playwright/test';

/**
 * LoginPage - Page Object Model for Login page
 *
 * Encapsulates login page interactions and selectors.
 * Provides reusable methods for E2E tests.
 */
export class LoginPage {
  readonly emailInput: Locator;

  readonly form: Locator;
  readonly page: Page;
  // page elements
  readonly pageContainer: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // initialize locators using data-testid
    this.pageContainer = page.getByTestId('login-page');
    this.form = page.getByTestId('login-form');
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-button');
  }

  /**
   * Click login submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Fill in email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Get submit button text
   */
  async getSubmitButtonText(): Promise<string> {
    return (await this.submitButton.textContent()) || '';
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return (await this.submitButton.getAttribute('disabled')) !== null;
  }

  /**
   * Complete login flow with provided credentials
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Wait for login page to be fully loaded
   */
  async waitForLoad() {
    await this.pageContainer.waitFor({ state: 'visible' });
    await this.form.waitFor({ state: 'visible' });
  }
}
