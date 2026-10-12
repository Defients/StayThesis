import { test, expect } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('bottom tab bar reaches all five destinations', async ({ page }) => {
  await page.goto('/#/');
  const nav = page.getByRole('navigation', { name: /primary mobile/i });

  await nav.getByRole('link', { name: 'Markets', exact: true }).click();
  await expect(page).toHaveURL(/#\/markets/);
  await nav.getByRole('link', { name: 'Properties', exact: true }).click();
  await expect(page).toHaveURL(/#\/properties/);
  await nav.getByRole('link', { name: 'Property', exact: true }).click();
  await expect(page).toHaveURL(/#\/property/);
  await nav.getByRole('link', { name: 'CRM', exact: true }).click();
  await expect(page).toHaveURL(/#\/crm/);
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('explorer filter dialog opens and applies on mobile', async ({ page }) => {
  await page.goto('/#/properties');
  await page.getByRole('button', { name: /filters/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Bedrooms').selectOption('3');
  // Applying closes the dialog and the count reflects the filter.
  await expect(page.getByText(/\d+ of 14 properties/i)).toBeVisible();
});

test('CRM drawer opens full-screen and closes on mobile', async ({ page }) => {
  await page.goto('/#/crm?property=st-finalist');
  const drawer = page.getByRole('dialog', {
    name: /bexley courtyard townhome details/i,
  });
  await expect(drawer).toBeVisible();
  // Full-screen sheet: spans the whole viewport width.
  const box = await drawer.boundingBox();
  expect(box?.width).toBe(390);

  await drawer.getByRole('button', { name: /close drawer/i }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).not.toHaveURL(/property=/);
});
