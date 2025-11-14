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
  readonly deleteButton: Locator;
  readonly editButton: Locator;
  readonly pageContainer: Locator;
  readonly pageHeaderSubheading: Locator;
  readonly pageHeaderTitle: Locator;

  constructor(page: Page) {
    super(page);

    // initialize project details specific locators
    this.pageContainer = page.getByTestId('project-details-page');
    this.backToProjectsButton = page.getByTestId('back-to-projects-button');
    this.backToProjectsButtonError = page.getByTestId('project-details-page-button');
    this.editButton = page.getByTestId('project-details-edit-button');
    this.deleteButton = page.getByTestId('project-details-delete-button');
    this.pageHeaderTitle = page.getByTestId('page-header-title');
    this.pageHeaderSubheading = page.getByTestId('page-header-subheading');
  }

  /**
   * Click back to projects button
   */
  async clickBackToProjects() {
    await this.backToProjectsButton.click();
  }

  /**
   * Click delete button to open delete dialog
   */
  async clickDelete() {
    await this.deleteButton.click();
  }

  /**
   * Click edit button to open edit dialog
   */
  async clickEdit() {
    await this.editButton.click();
  }

  /**
   * Get project description from page header
   */
  async getProjectDescription(): Promise<null | string> {
    const isVisible = await this.pageHeaderSubheading.isVisible().catch(() => false);
    if (!isVisible) {
      return null;
    }
    return await this.pageHeaderSubheading.textContent();
  }

  /**
   * Get project name from page header
   */
  async getProjectName(): Promise<string> {
    const text = await this.pageHeaderTitle.textContent();
    return text?.trim() || '';
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
    try {
      await this.backToProjectsButton.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      await this.backToProjectsButtonError.waitFor({ state: 'visible', timeout: 5000 });
    }
  }
}
