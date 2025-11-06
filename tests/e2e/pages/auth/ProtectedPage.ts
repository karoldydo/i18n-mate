import type { Locator, Page } from '@playwright/test';

/**
 * ProtectedPage - Page Object Model for protected pages
 *
 * Encapsulates common elements and interactions for all protected pages.
 * Provides reusable methods for E2E tests involving authenticated users.
 */
export class ProtectedPage {
  // layout elements
  readonly header: Locator;
  readonly page: Page;
  readonly sidebar: Locator;

  // user menu elements (in sidebar)
  readonly userMenuContent: Locator;
  readonly userMenuLogout: Locator;
  readonly userMenuTrigger: Locator;

  constructor(page: Page) {
    this.page = page;

    // initialize locators using data-testid
    this.header = page.getByTestId('app-header');
    this.sidebar = page.getByTestId('app-sidebar');
    this.userMenuTrigger = page.getByTestId('sidebar-user-menu-trigger');
    this.userMenuContent = page.getByTestId('sidebar-user-menu-content');
    this.userMenuLogout = page.getByTestId('sidebar-user-menu-logout');
  }

  /**
   * Click logout button in user menu
   */
  async clickLogout() {
    await this.userMenuLogout.click();
  }

  /**
   * Get user email from user menu trigger
   */
  async getUserEmail(): Promise<string> {
    const text = await this.userMenuTrigger.textContent();
    return text?.trim() || '';
  }

  /**
   * Check if user menu is visible
   */
  async isUserMenuVisible(): Promise<boolean> {
    return await this.userMenuTrigger.isVisible();
  }

  /**
   * Complete logout flow
   */
  async logout() {
    await this.openUserMenu();
    await this.clickLogout();
  }

  /**
   * Open user menu dropdown
   */
  async openUserMenu() {
    await this.userMenuTrigger.click();
    await this.userMenuContent.waitFor({ state: 'visible' });
  }

  /**
   * Wait for protected layout to be fully loaded
   */
  async waitForLoad() {
    await this.header.waitFor({ state: 'visible' });
    await this.sidebar.waitFor({ state: 'visible' });
  }
}
