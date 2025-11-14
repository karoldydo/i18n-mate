import { expect, test } from '@playwright/test';

import { CreateProjectDialogPage } from '../pages/projects/CreateProjectDialogPage';
import { DeleteProjectDialogPage } from '../pages/projects/DeleteProjectDialogPage';
import { ProjectDetailsPage } from '../pages/projects/ProjectDetailsPage';
import { ProjectListPage } from '../pages/projects/ProjectListPage';

/**
 * Delete Project E2E Tests
 *
 * Tests the project deletion flow including:
 * - Displaying project list page
 * - Creating a new project (prerequisite for deletion test)
 * - Displaying updated project list
 * - Searching for the created project
 * - Deleting the project via dropdown menu
 * - Confirming deletion in dialog
 * - Verifying project is removed from list
 */

test.describe('Delete Project', () => {
  test.use({ storageState: '.auth/user.json' });

  test('delete project via dropdown menu', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const createDialogPage = new CreateProjectDialogPage(page);
    const deleteDialogPage = new DeleteProjectDialogPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);

    // step 1: display list of projects
    await projectListPage.goto();
    await projectListPage.waitForPageLoad();

    // step 2: create a new project
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

    // wait for redirect to project details page
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    await projectDetailsPage.waitForPageLoad();

    // step 3: display list of projects
    await projectDetailsPage.clickBackToProjects();
    await page.waitForURL('/projects');
    await projectListPage.waitForPageLoad();

    // wait for project to appear in list with retry logic
    await expect(async () => {
      const projectExists = await projectListPage.hasProjectWithName(projectName);
      expect(projectExists).toBe(true);
    }).toPass({ timeout: 5000 });

    // step 4: find the created project on the list
    const projectId = await projectListPage.findProjectIdByName(projectName);
    expect(projectId).not.toBeNull();

    if (!projectId) {
      throw new Error(`Project with name "${projectName}" not found`);
    }

    // step 5: delete the searched project on the list using dropdown-menu -> delete
    await projectListPage.clickDeleteProject(projectId);

    // step 6: save changes (confirm deletion in dialog)
    await deleteDialogPage.waitForDialog();
    await deleteDialogPage.clickConfirm();

    // wait for redirect back to projects list after deletion
    await page.waitForURL('/projects');
    await projectListPage.waitForPageLoad();

    // step 7: verify if changes were correctly applied to the project list
    // wait for project to be removed from list with retry logic
    await expect(async () => {
      const projectStillExists = await projectListPage.hasProjectWithName(projectName);
      expect(projectStillExists).toBe(false);
    }).toPass({ timeout: 5000 });

    // verify project card is no longer visible
    const projectCard = projectListPage.getProjectCard(projectId);
    await expect(projectCard).not.toBeVisible();

    // step 8: end test
  });
});
