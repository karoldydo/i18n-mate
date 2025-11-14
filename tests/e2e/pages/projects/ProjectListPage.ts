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
   * Click edit action in project card dropdown menu
   */
  async clickEditProject(projectId: string) {
    // click the actions button to open dropdown
    const actionsButton = this.page.getByTestId(`project-card-actions-${projectId}`);
    await actionsButton.click();
    // wait for dropdown menu to be visible
    const menu = this.page.getByTestId(`project-card-menu-${projectId}`);
    await menu.waitFor({ state: 'visible' });
    // click edit menu item
    const editItem = this.page.getByTestId(`project-card-edit-${projectId}`);
    await editItem.click();
    // wait for dropdown to close
    try {
      await menu.waitFor({ state: 'hidden' });
    } catch {
      // menu already closed, ignore
    }
  }

  /**
   * Find project ID by project name
   */
  async findProjectIdByName(projectName: string): Promise<null | string> {
    // get all project name locators
    const nameLocators = await this.page.getByTestId(/^project-name-/).all();
    for (const locator of nameLocators) {
      const text = await locator.textContent();
      if (text?.trim() === projectName) {
        // extract project ID from testid attribute
        const testId = await locator.getAttribute('data-testid');
        if (testId) {
          const match = testId.match(/^project-name-(.+)$/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
    }
    return null;
  }

  /**
   * Get project card locator by project ID
   */
  getProjectCard(projectId: string): Locator {
    return this.page.getByTestId(`project-card-${projectId}`);
  }

  /**
   * Get project description by project ID
   */
  async getProjectDescription(projectId: string): Promise<null | string> {
    const locator = this.page.getByTestId(`project-description-${projectId}`);
    return await locator.textContent();
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
