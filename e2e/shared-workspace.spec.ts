import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { createWorkspaceHandler, ConflictError, type WorkspaceRepository } from '../src/server/handler';
import { createSharedInitialState } from '../src/server/transition';
import { setIdProvider } from '../src/lib/ids';
import { now } from '../src/lib/clock';

const origin = 'http://localhost:4174';
const api = 'https://staythesis-test.supabase.co';
function backend() {
  setIdProvider(prefix => `${prefix}-${crypto.randomUUID()}`);
  let state = createSharedInitialState();
  let version = 1;
  const events = new Map<string, { userId: string; action: unknown; notice: null }>();
  const repository: WorkspaceRepository = {
    authenticate: async token => token === 'joe-token' || token === 'deffy-token' ? token : null,
    read: async (_workspace, user) => ({ state, version, partnerId: user === 'joe-token' ? 'partner-a' : 'partner-b' }),
    findRequest: async (_workspace, id) => events.get(id) ?? null,
    commit: async input => {
      if (input.version !== version) throw new ConflictError();
      state = input.state; version++;
      events.set(input.requestId, { userId: input.userId, action: input.action, notice: null });
      return { state, version, notice: input.notice };
    },
  };
  const handler = createWorkspaceHandler(repository, [origin]);
  return async (page: Page) => {
    await page.route(`${api}/**`, async route => {
      const request = route.request();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (request.url().includes('/auth/v1/token')) {
        const { email } = request.postDataJSON();
        const user = email === 'joe@example.test' ? 'joe' : 'deffy';
        return route.fulfill({ status: 200, headers, json: {
          access_token: `${user}-token`, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600,
          expires_at: Math.floor(now().getTime() / 1000) + 3600,
          user: { id: user, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: now().toISOString() },
        } });
      }
      if (request.url().includes('/auth/v1/logout')) return route.fulfill({ status: 204, headers });
      if (request.url().includes('/functions/v1/workspace')) {
        const response = await handler(new Request(request.url(), {
          method: request.method(), headers: request.headers(), body: request.postData(),
        }));
        return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
      }
      throw new Error(`Unexpected shared API request: ${request.url()}`);
    });
  };
}

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
}

async function navigate(page: Page, hash: string) {
  await page.evaluate(value => { window.location.hash = value; }, hash);
}

test('two authenticated partners share notes, approvals and persisted reloads', async ({ page, browser }) => {
  const connect = backend(); await connect(page);
  await signIn(page, 'joe@example.test');
  await expect(page.getByRole('button', { name: 'Reset demo', exact: true })).toBeHidden();
  const identity = page.getByRole('group', { name: 'Acting partner' });
  await expect(identity.getByRole('button', { name: /Deffy/ })).toBeDisabled();
  await navigate(page, '/crm?property=st-finalist');
  await page.getByLabel('Note text').fill('Review the lease together');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('Lease review');
  await page.getByRole('button', { name: 'Request approval' }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click();
  await navigate(page, '/property/st-finalist/decision');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();

  const context = await browser.newContext();
  const deffy = await context.newPage();
  const errors: string[] = [];
  deffy.on('pageerror', e => errors.push(e.message));
  deffy.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await connect(deffy); await signIn(deffy, 'deffy@example.test');
    await navigate(deffy, '/crm?property=st-finalist');
    await expect(deffy.getByText('Review the lease together', { exact: true })).toBeVisible();
    await deffy.getByRole('button', { name: 'Close drawer', exact: true }).click();
    await navigate(deffy, '/property/st-finalist/decision');
    await expect(deffy.getByText('Approved', { exact: true })).toHaveCount(1);
    await deffy.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(deffy.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reload records' }).click();
    await expect(page.getByText('Approved', { exact: true })).toHaveCount(2);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Partner sign-in' })).toBeVisible();
    await signIn(page, 'joe@example.test');
    await navigate(page, '/property/st-finalist/decision');
    await expect(page.getByText('Approved', { exact: true })).toHaveCount(2);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Partner sign-in' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('captures unverified evidence and keeps shared and demo workspaces separate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const connect = backend(); await connect(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Partner sign-in' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/phase2-sign-in-desktop.png', fullPage: true });
  const signInAxe = await new AxeBuilder({ page }).analyze();
  expect(signInAxe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  await signIn(page, 'joe@example.test');
  await navigate(page, '/property/st-finalist/evidence');
  await page.getByText('Capture a source', { exact: true }).click();
  await page.screenshot({ path: 'artifacts/screenshots/phase2-source-capture-desktop.png', fullPage: true });
  await page.getByLabel('Metric or claim').fill('Lease permission review');
  await page.getByLabel('Observed value').fill('Draft still needs review');
  await page.getByLabel('Source name', { exact: true }).fill('Lease draft');
  await page.getByRole('button', { name: 'Add unverified evidence' }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
  const captured = page.getByRole('listitem').filter({ hasText: 'Lease permission review' });
  await expect(captured).toContainText('UNREVIEWED');
  await expect(captured.getByLabel('Classification')).toHaveValue('UNVERIFIED');
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Open offline demo' }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeHidden();
  await expect(page.getByText('Lease permission review', { exact: true })).toBeHidden();
});

test('shared sign-in and controls fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const connect = backend(); await connect(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Partner sign-in' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/phase2-sign-in-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await signIn(page, 'deffy@example.test');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('group', { name: 'Acting partner' }).getByRole('button', { name: /Joe/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset demo', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.getByRole('button', { name: 'Reload records' }).click();
  await expect(page.getByText('Shared workspace · Saved', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partner sign-in' })).toBeVisible();
});
