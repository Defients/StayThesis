import { test, expect } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('research → evaluate → qualify acquisition flow', async ({ page }) => {
  // Command Center
  await page.goto('/#/');
  await expect(
    page.getByRole('heading', {
      name: /good (morning|afternoon|evening)/i,
    }),
  ).toBeVisible();

  // → Market Intelligence, select Columbus OH
  await page.getByRole('link', { name: /market intelligence/i }).click();
  await expect(page).toHaveURL(/#\/markets/);
  await page.getByRole('row', { name: /columbusoh/i }).click();
  const cta = page.getByRole('link', {
    name: /view 3 properties in explorer/i,
  });
  await expect(cta).toBeVisible();
  await cta.click();

  // Explorer: market filter applied (3 Columbus OH candidates); tighten with
  // bedrooms = 2 — count is asserted either way.
  await expect(page.getByText(/3 of 14 properties/i)).toBeVisible();
  await page.getByLabel('Bedrooms').selectOption('2');
  await expect(page.getByText(/3 of 14 properties/i)).toBeVisible();

  // Open the awaiting-consent Columbus property (ST-106).
  await page
    .getByRole('link', { name: 'Short North Carriage Flat' })
    .click();
  await expect(page).toHaveURL(/#\/property\/st-consent-cbus/);

  // Underwriting: editing Base ADR changes the Base after-financing cell.
  await page.getByRole('tab', { name: 'Underwriting' }).click();
  const afCell = page
    .getByRole('row', { name: /after-financing cash flow/i })
    .getByRole('cell')
    .nth(1); // column order: Upside | Base | Conservative | Stress
  const before = await afCell.textContent();
  await page.getByLabel('ADR').fill('400');
  await expect(afCell).not.toHaveText(before ?? '___');

  // Compliance: PASS the two consent gates → eligible for Qualified.
  await page.getByRole('tab', { name: 'Compliance' }).click();
  await page
    .getByRole('radiogroup', { name: /^landlord authorization$/i })
    .getByRole('radio', { name: 'Pass' })
    .click();
  await page
    .getByRole('radiogroup', { name: /lease permission/i })
    .getByRole('radio', { name: 'Pass' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: /can be moved to qualified/i }),
  ).toBeVisible();

  // Advance the stage: final-audit, then Qualified.
  await page.getByLabel('Stage').selectOption('final-audit');
  await page.getByLabel('Stage').selectOption('qualified');

  // CRM: the card is in the Qualified column.
  await page.getByRole('link', { name: /acquisition crm/i }).click();
  const qualifiedCol = page.getByRole('region', {
    name: /qualified — 1 propert/i,
  });
  await expect(
    qualifiedCol.getByText('Short North Carriage Flat'),
  ).toBeVisible();

  // Command Center: the qualified-stage count in the KPI reflects it
  // (gate-eligible / qualified / ready).
  await page.getByRole('link', { name: /command center/i }).click();
  await expect(
    page.getByRole('link', { name: /qualified \/ ready/i }),
  ).toContainText(/\/\s*1\s*\//);
});
