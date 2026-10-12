import { describe, expect, it } from 'vitest';
import { readSharedConfig } from './config';

describe('shared mode configuration', () => {
  const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    VITE_WORKSPACE_ID: '11111111-1111-4111-8111-111111111111' };
  it('leaves the demo offline when no configuration is supplied', () => expect(readSharedConfig({})).toBeNull());
  it('accepts a complete public configuration', () => expect(readSharedConfig(env)?.workspaceId).toBe(env.VITE_WORKSPACE_ID));
  it('fails closed on incomplete configuration, unsafe URLs or secret keys', () => {
    for (const invalid of [{ ...env, VITE_WORKSPACE_ID: '' }, { ...env, VITE_SUPABASE_URL: 'http://remote.example' },
      { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_example' }, { ...env, VITE_WORKSPACE_ID: 'bad' }])
      expect(() => readSharedConfig(invalid)).toThrow();
  });
});
