import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const SCANS = [
  ['command center', '/#/'],
  ['market detail', '/#/markets?market=columbus-oh'],
  ['explorer', '/#/properties'],
  ['underwriting', '/#/property/st-finalist/underwriting'],
  ['compliance', '/#/property/st-finalist/compliance'],
  ['crm drawer', '/#/crm?property=st-finalist'],
] as const;

for (const [name, route] of SCANS) {
  test(`axe: ${name} has no serious/critical violations`, async ({ page }) => {
    await page.goto(route);
    // Let the lazy chunk, fonts and drawer settle before scanning.
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(
      violations.map(
        (v) =>
          `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });
}

test('keyboard: skip link reaches main, arrows move between property tabs', async ({
  page,
}) => {
  await page.goto('/#/property/st-finalist');

  // Skip link is the first tabbable element and lands focus in <main>.
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: /skip to content/i }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.id || el?.closest('main')?.id || '';
  });
  expect(focused).toBe('main-content');

  // ArrowRight moves the selected tab forward; ArrowLeft back.
  const tabs = page.getByRole('tablist');
  await tabs.getByRole('tab', { name: 'Overview' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Underwriting' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
