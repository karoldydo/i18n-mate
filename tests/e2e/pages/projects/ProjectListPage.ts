import type { Locator, Page } from '@playwright/test';

import { ProtectedPage } from '../auth/ProtectedPage';

/**
 * ProjectListPage - Page Object Model for Projects list page
 *
 * Extends ProtectedPage with project list specific elements.
 * Provides reusable methods for project list E2E tests.
 */
export class ProjectListPage extends ProtectedPage {
  // page elements
  readonly pageContainer: Locator;

  constructor(page: Page) {
    super(page);

    // initialize project list specific locators
    this.pageContainer = page.getByTestId('project-list-page');
  }

  /**
   * Navigate to projects page
   */
  async goto() {
    await this.page.goto('/projects');
  }

  /**
   * Wait for projects page to be fully loaded
   */
  async waitForPageLoad() {
    await super.waitForLoad(); // wait for protected layout
    await this.pageContainer.waitFor({ state: 'visible' }); // wait for page content
  }
}
