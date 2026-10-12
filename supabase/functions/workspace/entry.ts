import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createWorkspaceHandler } from '../../../src/server/handler.ts';
import { createSupabaseRepository } from '../../../src/server/supabaseRepository.ts';
import { setIdProvider } from '../../../src/lib/ids.ts';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const origins = (Deno.env.get('STAYTHESIS_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
if (!url || !key || origins.length === 0) throw new Error('Configure server URL, service role key, and allowed origins');
setIdProvider(prefix => `${prefix}-${crypto.randomUUID()}`);
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createWorkspaceHandler(createSupabaseRepository(admin), origins));
