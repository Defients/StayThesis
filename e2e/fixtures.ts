import { test as base, expect } from '@playwright/test';

/**
 * Shared fixture: every test fails if the page logs a console error or throws
 * an uncaught error. Asset 404s (e.g. favicon) are logged as resource errors,
 * not console errors, so they don't need allowlisting.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await use(page);
    expect(errors, 'browser console / page errors').toEqual([]);
  },
});

export { expect };
