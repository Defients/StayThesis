import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceRepository } from './handler';
import { ConflictError } from './handler';

/** Privileged client is created only in the Edge entry point, never in the SPA. */
export function createSupabaseRepository(admin: SupabaseClient): WorkspaceRepository {
  return {
    async authenticate(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error || data.user?.is_anonymous ? null : data.user?.id ?? null;
    },
    async read(workspaceId, userId) {
      const { data: member, error: membershipError } = await admin.from('workspace_members')
        .select('partner_id').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
      if (membershipError) throw membershipError;
      if (!member) return null;
      if (member.partner_id !== 'partner-a' && member.partner_id !== 'partner-b') throw new Error('Invalid membership');
      const { data, error } = await admin.from('workspaces').select('version,state,schema_version').eq('id', workspaceId).single();
      if (error) throw error;
      if (data.schema_version !== 1) throw new Error('Unsupported workspace schema');
      return { version: data.version, state: data.state, partnerId: member.partner_id };
    },
    async findRequest(workspaceId, requestId) {
      const { data, error } = await admin.from('workspace_events').select('user_id,action,notice')
        .eq('workspace_id', workspaceId).eq('request_id', requestId).maybeSingle();
      if (error) throw error;
      return data ? { userId: data.user_id, action: data.action, notice: data.notice } : null;
    },
    async commit(input) {
      const { data, error } = await admin.rpc('commit_workspace_action', {
        p_workspace_id: input.workspaceId, p_user_id: input.userId, p_partner_id: input.partnerId,
        p_expected_version: input.version, p_request_id: input.requestId, p_action: input.action,
        p_state: input.state, p_notice: input.notice,
      });
      if (error?.code === '40001') throw new ConflictError();
      if (error) throw error;
      return data;
    },
  };
}
