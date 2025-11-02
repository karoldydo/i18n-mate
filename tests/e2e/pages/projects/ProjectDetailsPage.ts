import type { Locator, Page } from '@playwright/test';

import { ProtectedPage } from '../auth/ProtectedPage';

/**
 * ProjectDetailsPage - Page Object Model for Project details page
 *
 * Extends ProtectedPage with project details specific elements.
 * Provides reusable methods for project details E2E tests.
 */
export class ProjectDetailsPage extends ProtectedPage {
  readonly backToProjectsButton: Locator;
  readonly backToProjectsButtonError: Locator;
  readonly pageContainer: Locator;

  constructor(page: Page) {
    super(page);

    // initialize project details specific locators
    this.pageContainer = page.getByTestId('project-details-page');
    this.backToProjectsButton = page.getByTestId('back-to-projects-button');
    this.backToProjectsButtonError = page.getByTestId('back-to-projects-button-error');
  }

  /**
   * Click back to projects button
   */
  async clickBackToProjects() {
    await this.backToProjectsButton.click();
  }

  /**
   * Navigate to project details page by project ID
   */
  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  /**
   * Wait for project details page to be fully loaded
   */
  async waitForPageLoad() {
    await super.waitForLoad(); // wait for protected layout
    await this.pageContainer.waitFor({ state: 'visible' }); // wait for page content
    // wait for back button (either normal or error state)
    await Promise.race([
      this.backToProjectsButton.waitFor({ state: 'visible' }).catch(() => undefined),
      this.backToProjectsButtonError.waitFor({ state: 'visible' }).catch(() => undefined),
    ]);
  }
}
