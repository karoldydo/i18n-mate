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
  readonly createProjectButton: Locator;
  readonly createProjectButtonEmpty: Locator;
  readonly pageContainer: Locator;
  readonly projectListCards: Locator;
  readonly projectListEmpty: Locator;

  constructor(page: Page) {
    super(page);

    // initialize project list specific locators
    this.pageContainer = page.getByTestId('project-list-page');
    this.projectListEmpty = page.getByTestId('project-list-empty');
    this.projectListCards = page.getByTestId('project-list-table');
    this.createProjectButton = page.getByTestId('create-project-button');
    this.createProjectButtonEmpty = page.getByTestId('create-project-button-empty');
  }

  /**
   * Click create project button (handles both empty state and card list state)
   */
  async clickCreateProject() {
    const isEmptyState = await this.projectListEmpty.isVisible().catch(() => false);
    if (isEmptyState) {
      await this.createProjectButtonEmpty.click();
    } else {
      await this.createProjectButton.click();
    }
  }

  /**
   * Get project card locator by project ID
   */
  getProjectCard(projectId: string): Locator {
    return this.page.getByTestId(`project-card-${projectId}`);
  }

  /**
   * Get project name by project ID
   */
  async getProjectName(projectId: string): Promise<null | string> {
    const locator = this.page.getByTestId(`project-name-${projectId}`);
    return await locator.textContent();
  }

  /**
   * Navigate to projects page
   */
  async goto() {
    await this.page.goto('/projects');
  }

  /**
   * Check if project exists in the list by name
   */
  async hasProjectWithName(projectName: string): Promise<boolean> {
    // check if project name exists anywhere in the card list
    const nameLocators = await this.page.getByTestId(/^project-name-/).all();
    for (const locator of nameLocators) {
      const text = await locator.textContent();
      if (text?.trim() === projectName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if projects list is empty
   */
  async isEmpty(): Promise<boolean> {
    return await this.projectListEmpty.isVisible().catch(() => false);
  }

  /**
   * Wait for projects page to be fully loaded
   */
  async waitForPageLoad() {
    await super.waitForLoad(); // wait for protected layout
    await this.pageContainer.waitFor({ state: 'visible' }); // wait for page content
    // wait for either empty state or card list to be visible
    try {
      await this.projectListCards.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      await this.projectListEmpty.waitFor({ state: 'visible', timeout: 5000 });
    }
  }
}
