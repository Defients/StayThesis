import { test, expect } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('negative financials flag the conservative gate and block the deal', async ({
  page,
}) => {
  await page.goto('/#/property/st-finalist/underwriting');

  // Edit the Conservative scenario.
  await page
    .getByRole('radiogroup', { name: /scenario to edit/i })
    .getByRole('radio', { name: 'Conservative' })
    .click();
  await page
    .getByRole('spinbutton', { name: 'Occupancy', exact: true })
    .fill('0');

  // After-financing is negative (critical styling + minus sign), margin is
  // unavailable rather than a nonsense number.
  const marginRow = page.getByRole('row', { name: /operating margin/i });
  await expect(marginRow.getByRole('cell').nth(2)).toContainText(/unavailable/i);
  const afRow = page.getByRole('row', {
    name: /after-financing cash flow/i,
  });
  await expect(afRow.getByRole('cell').nth(2)).toContainText('−');

  // The calculated conservative-performance gate FAILS and blocks the deal.
  await page.getByRole('tab', { name: 'Compliance' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /cannot qualify:/i }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('radiogroup', { name: /conservative-case performance/i })
      .getByRole('radio', { name: 'Fail' }),
  ).toHaveAttribute('aria-checked', 'true');
});

test('legally-blocked property cannot move to Qualified from the CRM', async ({
  page,
}) => {
  await page.goto('/#/crm');
  await page
    .getByRole('combobox', { name: /move uptown brick flat to stage/i })
    .selectOption('qualified');

  // Refusal notice is shown and the card stays in Underwriting.
  await expect(
    page.getByRole('status').filter({ hasText: /cannot qualify —/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: /qualified — 0 propert/i }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: /underwriting/i })
      .getByText('Uptown Brick Flat'),
  ).toBeVisible();
});

test('failing a critical gate blocks the finalist and refuses Qualified', async ({
  page,
}) => {
  await page.goto('/#/property/st-finalist/compliance');
  await page
    .getByRole('radiogroup', { name: /str-appropriate insurance/i })
    .getByRole('radio', { name: 'Fail' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: /cannot qualify:/i }),
  ).toBeVisible();

  // Attempting Qualified via the header stage select is refused with notice.
  await page.getByLabel('Stage').selectOption('qualified');
  await expect(
    page.getByRole('status').filter({ hasText: /cannot qualify —/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Stage')).toHaveValue('final-audit');
});

test('reset demo restores the seeded workspace', async ({ page }) => {
  await page.goto('/#/property/st-finalist/compliance');
  await page
    .getByRole('radiogroup', { name: /str-appropriate insurance/i })
    .getByRole('radio', { name: 'Fail' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: /cannot qualify:/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  const dialog = page.getByRole('dialog', {
    name: /reset demo workspace/i,
  });
  await dialog.getByRole('button', { name: 'Reset demo' }).click();

  // Seed state restored — finalist is gate-clean again.
  await expect(
    page.getByRole('status').filter({ hasText: /can be moved to qualified/i }),
  ).toBeVisible();
});
