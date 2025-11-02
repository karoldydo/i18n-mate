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
  readonly projectListEmpty: Locator;
  readonly projectListTable: Locator;

  constructor(page: Page) {
    super(page);

    // initialize project list specific locators
    this.pageContainer = page.getByTestId('project-list-page');
    this.projectListEmpty = page.getByTestId('project-list-empty');
    this.projectListTable = page.getByTestId('project-list-table');
    this.createProjectButton = page.getByTestId('create-project-button');
    this.createProjectButtonEmpty = page.getByTestId('create-project-button-empty');
  }

  /**
   * Click create project button (handles both empty state and table state)
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
   * Get project name by project ID
   */
  async getProjectName(projectId: string): Promise<null | string> {
    const locator = this.page.getByTestId(`project-name-${projectId}`);
    return await locator.textContent();
  }

  /**
   * Get project row locator by project ID
   */
  getProjectRow(projectId: string): Locator {
    return this.page.getByTestId(`project-row-${projectId}`);
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
    // check if project name exists anywhere in the table
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
    // wait for either empty state or table to be visible
    await Promise.race([
      this.projectListEmpty.waitFor({ state: 'visible' }).catch(() => undefined),
      this.projectListTable.waitFor({ state: 'visible' }).catch(() => undefined),
    ]);
  }
}
