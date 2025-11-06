import { expect, test } from '@playwright/test';

import { CreateProjectDialogPage } from '../pages/projects/CreateProjectDialogPage';
import { ProjectDetailsPage } from '../pages/projects/ProjectDetailsPage';
import { ProjectListPage } from '../pages/projects/ProjectListPage';

/**
 * Create Project E2E Tests
 *
 * Tests the project creation flow including:
 * - Displaying project list page
 * - Handling empty state vs table state
 * - Opening create project dialog
 * - Filling form with all fields
 * - Selecting locale from dropdown
 * - Verifying locale label auto-fill
 * - Submitting form and waiting for redirect to project details
 * - Navigating back to project list
 * - Verifying created project appears in list
 */

test.describe('Create Project', () => {
  test.use({ storageState: '.auth/user.json' });

  test('create new project with all fields', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const createDialogPage = new CreateProjectDialogPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);

    // step 1: navigate to projects page and wait for list to load
    await projectListPage.goto();
    await projectListPage.waitForPageLoad();

    // step 2: check if there are existing projects (determines which button to use)
    const isEmpty = await projectListPage.isEmpty();
    expect(isEmpty !== undefined).toBeTruthy(); // verify state detection works

    // step 3: click appropriate create project button
    await projectListPage.clickCreateProject();

    // step 4: wait for dialog to open
    await createDialogPage.waitForDialog();

    // step 5: fill form with dynamic data
    const timestamp = Date.now();
    const projectName = `Test Project ${timestamp}`;
    const projectDescription = `Test project description created at ${new Date(timestamp).toISOString()}`;
    // generate unique prefix: 2-4 chars, using last 3 digits of timestamp
    const prefixSuffix = timestamp.toString().slice(-3);
    const projectPrefix = `t${prefixSuffix}`; // 4 chars: 't' + 3 digits

    await createDialogPage.fillForm({
      description: projectDescription,
      localeCode: 'en',
      name: projectName,
      prefix: projectPrefix,
    });

    // step 6: verify locale label was auto-filled correctly after selecting locale
    const localeLabel = await createDialogPage.getLocaleLabel();
    expect(localeLabel).toBe('English');

    // step 7: click "Create Project" button
    await createDialogPage.clickSubmit();

    // step 8: wait for redirect to project details page
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    await projectDetailsPage.waitForPageLoad();

    // step 9: click back to projects button
    await projectDetailsPage.clickBackToProjects();

    // step 10: wait for redirect back to projects list
    await page.waitForURL('/projects');
    await projectListPage.waitForPageLoad();

    // step 11: wait for project list to refresh (query invalidation after creation)
    // wait for project name to appear with retry logic
    await expect(async () => {
      const projectExists = await projectListPage.hasProjectWithName(projectName);
      expect(projectExists).toBe(true);
    }).toPass({ timeout: 5000 });

    // step 12: verify created project appears in the list
    const projectExists = await projectListPage.hasProjectWithName(projectName);
    expect(projectExists).toBe(true);

    // step 13: verify project name is visible in the card list
    const nameLocators = await page.getByTestId(/^project-name-/).all();
    let projectFound = false;
    for (const locator of nameLocators) {
      const text = await locator.textContent();
      if (text?.trim() === projectName) {
        projectFound = true;
        await expect(locator).toBeVisible();
        break;
      }
    }
    expect(projectFound).toBe(true);
  });
});
