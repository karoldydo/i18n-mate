import { expect, test } from '@playwright/test';

import { CreateProjectDialogPage } from '../pages/projects/CreateProjectDialogPage';
import { DeleteProjectDialogPage } from '../pages/projects/DeleteProjectDialogPage';
import { ProjectDetailsPage } from '../pages/projects/ProjectDetailsPage';
import { ProjectListPage } from '../pages/projects/ProjectListPage';

/**
 * Delete Project from Details Page E2E Tests
 *
 * Tests the project deletion flow from project details page including:
 * - Displaying project list page
 * - Creating a new project
 * - After creation, redirect to project details
 * - Click Delete button to open dialog
 * - Delete project
 * - Verify redirect to project list
 * - Verify deleted project is not in list
 * - End test
 */

test.describe('Delete Project from Details Page', () => {
  test.use({ storageState: '.auth/user.json' });

  test('delete project from details page', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const createDialogPage = new CreateProjectDialogPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);
    const deleteDialogPage = new DeleteProjectDialogPage(page);

    // step 1: display list of projects
    await projectListPage.goto();
    await projectListPage.waitForPageLoad();

    // step 2: create new project
    await projectListPage.clickCreateProject();
    await createDialogPage.waitForDialog();

    // generate unique project data
    const timestamp = Date.now();
    const projectName = `Test Project ${timestamp}`;
    const projectDescription = `Test project description created at ${new Date(timestamp).toISOString()}`;
    const prefixSuffix = timestamp.toString().slice(-3);
    const projectPrefix = `t${prefixSuffix}`;

    await createDialogPage.fillForm({
      description: projectDescription,
      localeCode: 'en',
      name: projectName,
      prefix: projectPrefix,
    });

    await createDialogPage.clickSubmit();

    // step 3: after creation, redirect to project details
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    await projectDetailsPage.waitForPageLoad();

    // verify project name matches created project
    const displayedProjectName = await projectDetailsPage.getProjectName();
    expect(displayedProjectName).toBe(projectName);

    // step 4: click delete button to open dialog
    await projectDetailsPage.clickDelete();
    await deleteDialogPage.waitForDialog();

    // step 5: delete project
    await deleteDialogPage.clickConfirm();

    // step 6: verify redirect to project list
    await page.waitForURL('/projects');
    await projectListPage.waitForPageLoad();

    // step 7: verify deleted project is not in list
    await expect(async () => {
      const projectStillExists = await projectListPage.hasProjectWithName(projectName);
      expect(projectStillExists).toBe(false);
    }).toPass({ timeout: 5000 });
  });
});
