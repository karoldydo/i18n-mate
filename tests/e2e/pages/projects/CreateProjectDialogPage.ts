import type { Locator, Page } from '@playwright/test';

/**
 * CreateProjectDialogPage - Page Object Model for Create Project dialog
 *
 * Encapsulates create project dialog interactions and selectors.
 * Provides reusable methods for E2E tests involving project creation.
 */
export class CreateProjectDialogPage {
  readonly createButton: Locator;
  readonly descriptionInput: Locator;
  readonly dialog: Locator;
  readonly localeLabelInput: Locator;
  readonly localeSelector: Locator;
  readonly localeSelectorContent: Locator;
  readonly localeSelectorTrigger: Locator;
  readonly nameInput: Locator;
  readonly page: Page;
  readonly prefixInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // initialize locators using data-testid
    this.dialog = page.getByTestId('create-project-dialog');
    this.nameInput = page.getByTestId('create-project-name-input');
    this.descriptionInput = page.getByTestId('create-project-description-input');
    this.prefixInput = page.getByTestId('create-project-prefix-input');
    this.localeSelector = page.getByTestId('create-project-locale-selector');
    this.localeSelectorTrigger = page.getByTestId('locale-selector-trigger');
    this.localeSelectorContent = page.getByTestId('locale-selector-content');
    this.localeLabelInput = page.getByTestId('create-project-locale-label-input');
    this.submitButton = page.getByTestId('create-project-submit-button');
  }

  /**
   * Click submit button to create project
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
   * Complete form fill with all required fields
   */
  async fillForm(data: { description?: string; localeCode: string; name: string; prefix: string }) {
    await this.fillName(data.name);
    if (data.description) {
      await this.fillDescription(data.description);
    }
    await this.fillPrefix(data.prefix);
    await this.selectLocale(data.localeCode);
  }

  /**
   * Fill in locale label field
   */
  async fillLocaleLabel(label: string) {
    await this.localeLabelInput.fill(label);
  }

  /**
   * Fill in name field
   */
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Fill in prefix field
   */
  async fillPrefix(prefix: string) {
    await this.prefixInput.fill(prefix);
  }

  /**
   * Get locale label value
   */
  async getLocaleLabel(): Promise<string> {
    return (await this.localeLabelInput.inputValue()) || '';
  }

  /**
   * Select locale from dropdown by locale code (e.g., 'en')
   */
  async selectLocale(localeCode: string) {
    // click trigger to open dropdown
    await this.localeSelectorTrigger.click();
    // wait for content to be visible
    await this.localeSelectorContent.waitFor({ state: 'visible' });
    // click on the locale option
    const localeOption = this.page.getByTestId(`locale-option-${localeCode}`);
    await localeOption.click();
    // wait for dropdown to close (ignore error if already closed)
    try {
      await this.localeSelectorContent.waitFor({ state: 'hidden' });
    } catch {
      // dropdown already closed, ignore
    }
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
