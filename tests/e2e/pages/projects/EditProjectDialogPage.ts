import type { Locator, Page } from '@playwright/test';

/**
 * EditProjectDialogPage - Page Object Model for Edit Project dialog
 *
 * Encapsulates edit project dialog interactions and selectors.
 * Provides reusable methods for E2E tests involving project editing.
 */
export class EditProjectDialogPage {
  readonly cancelButton: Locator;
  readonly descriptionInput: Locator;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // initialize locators using data-testid
    this.dialog = page.getByTestId('edit-project-dialog');
    this.nameInput = page.getByTestId('edit-project-name-input');
    this.descriptionInput = page.getByTestId('edit-project-description-input');
    this.cancelButton = page.getByTestId('edit-project-cancel-button');
    this.submitButton = page.getByTestId('edit-project-submit-button');
  }

  /**
   * Click cancel button to close dialog
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Click submit button to save changes
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Fill in description field
   */
  async fillDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  /**
   * Complete form fill with name and description
   */
  async fillForm(data: { description?: string; name: string }) {
    await this.fillName(data.name);
    if (data.description !== undefined) {
      await this.fillDescription(data.description);
    }
  }

  /**
   * Fill in name field
   */
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Get description value
   */
  async getDescription(): Promise<string> {
    return (await this.descriptionInput.inputValue()) || '';
  }

  /**
   * Get name value
   */
  async getName(): Promise<string> {
    return (await this.nameInput.inputValue()) || '';
  }

  /**
   * Wait for dialog to be fully loaded and visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible' });
    await this.nameInput.waitFor({ state: 'visible' });
  }

  /**
   * Wait for dialog to close
   */
  async waitForDialogClose() {
    await this.dialog.waitFor({ state: 'hidden' });
  }
}
