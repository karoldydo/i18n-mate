import type { Locator, Page } from '@playwright/test';

/**
 * DeleteProjectDialogPage - Page Object Model for Delete Project dialog
 *
 * Encapsulates delete project dialog interactions and selectors.
 * Provides reusable methods for E2E tests involving project deletion.
 */
export class DeleteProjectDialogPage {
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;
  readonly dialog: Locator;
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;

    // initialize locators using data-testid
    this.dialog = page.getByTestId('delete-project-dialog');
    this.cancelButton = page.getByTestId('delete-project-cancel-button');
    this.confirmButton = page.getByTestId('delete-project-confirm-button');
  }

  /**
   * Click cancel button to close dialog without deleting
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Click confirm button to delete project
   */
  async clickConfirm() {
    await this.confirmButton.click();
  }

  /**
   * Wait for dialog to be fully loaded and visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible' });
    await this.confirmButton.waitFor({ state: 'visible' });
  }

  /**
   * Wait for dialog to close
   */
  async waitForDialogClose() {
    await this.dialog.waitFor({ state: 'hidden' });
  }
}
