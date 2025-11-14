import { expect, test } from '@playwright/test';

import { CreateProjectDialogPage } from '../pages/projects/CreateProjectDialogPage';
import { EditProjectDialogPage } from '../pages/projects/EditProjectDialogPage';
import { ProjectDetailsPage } from '../pages/projects/ProjectDetailsPage';
import { ProjectListPage } from '../pages/projects/ProjectListPage';

/**
 * Edit Project From Details Page E2E Tests
 *
 * Tests the project editing flow from the project details page including:
 * - Displaying project list page
 * - Creating a new project
 * - Redirect to project details page after creation
 * - Opening edit dialog via edit button on details page
 * - Updating project name and description
 * - Saving changes and verifying updates on details page
 * - Verifying breadcrumb navigation shows updated project name
 */

test.describe('Edit Project From Details Page', () => {
  test.use({ storageState: '.auth/user.json' });

  test('edit project name and description from details page', async ({ page }) => {
    const projectListPage = new ProjectListPage(page);
    const createDialogPage = new CreateProjectDialogPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);
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

    // step 3: wait for redirect to project details page after creation
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    await projectDetailsPage.waitForPageLoad();

    // verify original project name and description are displayed on details page
    const displayedName = await projectDetailsPage.getProjectName();
    expect(displayedName).toBe(originalProjectName);

    const displayedDescription = await projectDetailsPage.getProjectDescription();
    expect(displayedDescription).toBe(originalProjectDescription);

    // step 4: click edit button on details page
    await projectDetailsPage.clickEdit();

    // step 5: edit project changing name and description
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

    // step 6: save changes
    await editDialogPage.clickSubmit();

    // wait for dialog to close
    await editDialogPage.waitForDialogClose();

    // step 7: verify changes were correctly applied on project details view
    // wait for page to update (query invalidation after update)
    await expect(async () => {
      const updatedName = await projectDetailsPage.getProjectName();
      expect(updatedName).toBe(updatedProjectName);
    }).toPass({ timeout: 5000 });

    // verify updated name is displayed
    const finalName = await projectDetailsPage.getProjectName();
    expect(finalName).toBe(updatedProjectName);

    // verify updated description is displayed
    const finalDescription = await projectDetailsPage.getProjectDescription();
    expect(finalDescription).toBe(updatedProjectDescription);

    // step 8: verify project name also changed in breadcrumb navigation
    // breadcrumb can be either a link (if on sub-page) or page (if on details page)
    // try both testids since we're on the details page itself
    const breadcrumbProjectName = page.getByTestId('breadcrumb-project-name');
    const breadcrumbProjectLink = page.getByTestId('breadcrumb-project-link');

    // check which one is visible (should be breadcrumb-project-name since we're on details page)
    const isNameVisible = await breadcrumbProjectName.isVisible().catch(() => false);
    const isLinkVisible = await breadcrumbProjectLink.isVisible().catch(() => false);

    if (isNameVisible) {
      const breadcrumbName = await breadcrumbProjectName.textContent();
      expect(breadcrumbName?.trim()).toBe(updatedProjectName);
    } else if (isLinkVisible) {
      const breadcrumbLinkText = await breadcrumbProjectLink.textContent();
      expect(breadcrumbLinkText?.trim()).toBe(updatedProjectName);
    } else {
      throw new Error('Breadcrumb project name not found');
    }
  });
});
