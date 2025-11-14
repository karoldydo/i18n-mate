import { expect, test } from '@playwright/test';

import { CreateProjectDialogPage } from '../pages/projects/CreateProjectDialogPage';
import { EditProjectDialogPage } from '../pages/projects/EditProjectDialogPage';
import { ProjectListPage } from '../pages/projects/ProjectListPage';

/**
 * Edit Project E2E Tests
 *
 * Tests the project editing flow including:
 * - Displaying project list page
 * - Creating a new project
 * - Searching for created project in the list
 * - Opening edit dialog via dropdown menu
 * - Updating project name and description
 * - Saving changes and verifying updates in the list
 */

test.describe('Edit Project', () => {
  test.use({ storageState: '.auth/user.json' });

  test('edit project name and description', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const createDialogPage = new CreateProjectDialogPage(page);
    const editDialogPage = new EditProjectDialogPage(page);

    // step 1: display project list
    await projectListPage.goto();
    await projectListPage.waitForPageLoad();

    // step 2: create new project
    const timestamp = Date.now();
    const originalProjectName = `Test Project ${timestamp}`;
    const originalProjectDescription = `Original description ${timestamp}`;
    // generate unique prefix: 2-4 chars, using last 3 digits of timestamp
    const prefixSuffix = timestamp.toString().slice(-3);
    const projectPrefix = `t${prefixSuffix}`; // 4 chars: 't' + 3 digits

    await projectListPage.clickCreateProject();
    await createDialogPage.waitForDialog();

    await createDialogPage.fillForm({
      description: originalProjectDescription,
      localeCode: 'en',
      name: originalProjectName,
      prefix: projectPrefix,
    });

    await createDialogPage.clickSubmit();

    // wait for redirect to project details page, then navigate back
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    await projectListPage.goto();
    await projectListPage.waitForPageLoad();

    // step 3: display project list again (after creation)
    // wait for project to appear in list with retry logic
    await expect(async () => {
      const projectExists = await projectListPage.hasProjectWithName(originalProjectName);
      expect(projectExists).toBe(true);
    }).toPass({ timeout: 5000 });

    // step 4: search for created project on the list
    const projectId = await projectListPage.findProjectIdByName(originalProjectName);
    expect(projectId).not.toBeNull();

    // prevent lint error
    if (!projectId) {
      throw new Error('Project ID not found');
    }

    // verify project is visible
    const projectCard = projectListPage.getProjectCard(projectId);
    await expect(projectCard).toBeVisible();

    // verify original name and description are displayed
    const displayedName = await projectListPage.getProjectName(projectId);
    expect(displayedName).toBe(originalProjectName);

    const displayedDescription = await projectListPage.getProjectDescription(projectId);
    expect(displayedDescription).toBe(originalProjectDescription);

    // step 5: edit project using dropdown menu -> edit
    await projectListPage.clickEditProject(projectId);

    // step 6: change project name and description
    await editDialogPage.waitForDialog();

    // verify form is pre-filled with original values
    const formName = await editDialogPage.getName();
    expect(formName).toBe(originalProjectName);

    const formDescription = await editDialogPage.getDescription();
    expect(formDescription).toBe(originalProjectDescription);

    // update with new values
    const updatedProjectName = `Updated Project ${timestamp}`;
    const updatedProjectDescription = `Updated description ${timestamp}`;

    await editDialogPage.fillForm({
      description: updatedProjectDescription,
      name: updatedProjectName,
    });

    // step 7: save changes
    await editDialogPage.clickSubmit();

    // wait for dialog to close
    await editDialogPage.waitForDialogClose();

    // step 8: verify changes were correctly applied to project list
    // wait for list to refresh (query invalidation after update)
    await expect(async () => {
      const updatedName = await projectListPage.getProjectName(projectId);
      expect(updatedName).toBe(updatedProjectName);
    }).toPass({ timeout: 5000 });

    // verify updated name is displayed
    const finalName = await projectListPage.getProjectName(projectId);
    expect(finalName).toBe(updatedProjectName);

    // verify updated description is displayed
    const finalDescription = await projectListPage.getProjectDescription(projectId);
    expect(finalDescription).toBe(updatedProjectDescription);

    // verify project still exists with updated name
    const projectExists = await projectListPage.hasProjectWithName(updatedProjectName);
    expect(projectExists).toBe(true);

    // verify old name no longer exists
    const oldNameExists = await projectListPage.hasProjectWithName(originalProjectName);
    expect(oldNameExists).toBe(false);
  });
});
