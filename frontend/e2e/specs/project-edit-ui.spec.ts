import { test, expect } from '@playwright/test';

test.describe('Project Detail Edit', () => {
  test('edit and save project via UI', async ({ page }) => {
    // Go to project detail page
    await page.goto('http://localhost:5173/projects/49');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check project name is displayed (use the second h1 which is the project name)
    const projectName = await page.locator('h1').nth(1).textContent();
    console.log('Initial project name:', projectName);

    // Click Edit button
    const editButton = page.getByRole('button', { name: /Edit/i });
    await editButton.click();

    // Wait for edit form to appear
    await page.waitForTimeout(500);

    // Fill in new name
    const nameInput = page.locator('input').first();
    await nameInput.fill('UI Test Name');

    // Click Save Changes
    const saveButton = page.getByRole('button', { name: /Save Changes/i });
    await saveButton.click();

    // Wait for the save to complete
    await page.waitForTimeout(1500);

    // Verify the name is updated on the page (second h1)
    const updatedName = await page.locator('h1').nth(1).textContent();
    console.log('Updated project name:', updatedName);

    // Verify via API
    const response = await fetch('http://localhost:8080/api/v1/projects/49');
    const project = await response.json();
    console.log('API project name:', project.name);

    expect(project.name).toBe('UI Test Name');
  });
});
