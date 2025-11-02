import { expect, test } from '@playwright/test';

import { TEST_PROJECTS, TEST_USERS } from '../fixtures/test-users';

/**
 * Project Management E2E Tests
 *
 * Tests the complete project CRUD workflow:
 * - Creating new projects
 * - Viewing project list
 * - Editing project details
 * - Deleting projects
 * - Form validation
 */

test.describe('Project Management', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Login with valid credentials
    await page.getByLabel(/email/i).fill(TEST_USERS.validUser.email);
    await page.getByLabel(/password/i).fill(TEST_USERS.validUser.password);
    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for navigation to projects page
    await page.waitForURL('/projects', { timeout: 10000 });
  });

  test('should display projects page with create button', async ({ page }) => {
    // Verify projects page elements
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create project|new project/i })).toBeVisible();
  });

  test('should open create project dialog', async ({ page }) => {
    // Click create project button
    await page.getByRole('button', { name: /create project|new project/i }).click();

    // Verify dialog is visible
    await expect(page.getByRole('dialog', { name: /create project|new project/i })).toBeVisible();

    // Verify form fields
    await expect(page.getByLabel(/project name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/prefix/i)).toBeVisible();
    await expect(page.getByLabel(/default language/i)).toBeVisible();
  });

  test('should validate required fields when creating project', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /create project|new project/i }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify validation messages
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/prefix is required/i)).toBeVisible();
  });

  test('should validate prefix format (2-4 characters)', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /create project|new project/i }).click();

    // Test too short prefix
    await page.getByLabel(/prefix/i).fill('a');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/prefix must be (at least )?2.*characters/i)).toBeVisible();

    // Test too long prefix
    await page.getByLabel(/prefix/i).fill('toolong');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/prefix must be (at most )?4.*characters/i)).toBeVisible();
  });

  test('should successfully create a new project', async ({ page }) => {
    // Generate unique project name
    const uniqueProjectName = `${TEST_PROJECTS.validProject.name} ${Date.now()}`;

    // Open create dialog
    await page.getByRole('button', { name: /create project|new project/i }).click();

    // Fill form
    await page.getByLabel(/project name/i).fill(uniqueProjectName);
    await page.getByLabel(/description/i).fill(TEST_PROJECTS.validProject.description);
    await page.getByLabel(/prefix/i).fill(TEST_PROJECTS.validProject.prefix);

    // Select default language (if it's a select/combobox)
    const languageField = page.getByLabel(/default language/i);
    await languageField.click();
    await page.getByRole('option', { name: /en-US|English/i }).click();

    // Submit form
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify success message
    await expect(page.getByText(/project created|successfully created/i)).toBeVisible();

    // Verify project appears in list
    await expect(page.getByText(uniqueProjectName)).toBeVisible();
  });

  test('should display project details when clicking on a project', async ({ page }) => {
    // Assuming there's at least one project
    const firstProject = page.getByRole('link', { name: /view project|open/i }).first();

    // Click on project
    await firstProject.click();

    // Verify navigation to project detail page
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);

    // Verify project detail elements are visible
    await expect(page.getByRole('heading', { name: /project/i })).toBeVisible();
  });

  test('should update project details', async ({ page }) => {
    // Create a project first
    await page.getByRole('button', { name: /create project|new project/i }).click();
    const projectName = `Update Test ${Date.now()}`;
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByLabel(/prefix/i).fill('upd');
    await page.getByRole('button', { name: /create|save/i }).click();

    // Wait for creation
    await expect(page.getByText(/project created/i)).toBeVisible();

    // Find and click edit button for the project
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Update the name
    const updatedName = `${projectName} - Updated`;
    await page.getByLabel(/project name/i).clear();
    await page.getByLabel(/project name/i).fill(updatedName);

    // Save changes
    await page.getByRole('button', { name: /update|save/i }).click();

    // Verify success
    await expect(page.getByText(/project updated|successfully updated/i)).toBeVisible();
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test('should not allow changing immutable prefix', async ({ page }) => {
    // Navigate to edit mode for any project
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Verify prefix field is disabled
    const prefixField = page.getByLabel(/prefix/i);
    await expect(prefixField).toBeDisabled();
  });

  test('should delete a project with confirmation', async ({ page }) => {
    // Create a project to delete
    await page.getByRole('button', { name: /create project|new project/i }).click();
    const projectName = `Delete Test ${Date.now()}`;
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByLabel(/prefix/i).fill('del');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/project created/i)).toBeVisible();

    // Find and click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Verify confirmation dialog
    await expect(page.getByText(/are you sure|confirm delete/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Verify success
    await expect(page.getByText(/project deleted|successfully deleted/i)).toBeVisible();

    // Verify project is removed from list
    await expect(page.getByText(projectName)).not.toBeVisible();
  });

  test('should cancel project deletion', async ({ page }) => {
    // Assuming there's at least one project
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Verify confirmation dialog
    await expect(page.getByText(/are you sure|confirm delete/i)).toBeVisible();

    // Cancel deletion
    await page.getByRole('button', { name: /cancel|no/i }).click();

    // Verify dialog is closed and project still exists
    await expect(page.getByText(/are you sure|confirm delete/i)).not.toBeVisible();
  });

  test('should handle duplicate prefix error', async ({ page }) => {
    // Create first project
    const prefix = 'dup';
    await page.getByRole('button', { name: /create project|new project/i }).click();
    await page.getByLabel(/project name/i).fill('First Project');
    await page.getByLabel(/prefix/i).fill(prefix);
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/project created/i)).toBeVisible();

    // Try to create second project with same prefix
    await page.getByRole('button', { name: /create project|new project/i }).click();
    await page.getByLabel(/project name/i).fill('Second Project');
    await page.getByLabel(/prefix/i).fill(prefix);
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify error message
    await expect(page.getByText(/prefix (already|is) (exists|taken|in use)/i)).toBeVisible();
  });
});
