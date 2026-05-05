import { supabase } from '@/lib/supabase';

export type AuditEvent =
  | 'orders.insert.attempt'
  | 'orders.insert.success'
  | 'orders.insert.403'
  | 'orders.insert.23505'
  | 'orders.insert.error'
  | 'customers.autocreate.success'
  | 'customers.autocreate.failed';

export interface AuditLogEntry {
  request_id: string;
  event: AuditEvent;
  user_id?: string | null;
  http_status?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
  source?: string;
}

export const newRequestId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

export async function recordAuditLog(entry: AuditLogEntry) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      request_id: entry.request_id,
      event: entry.event,
      user_id: entry.user_id ?? null,
      http_status: entry.http_status ?? null,
      error_code: entry.error_code ?? null,
      error_message: entry.error_message ?? null,
      payload: entry.payload ?? null,
      context: entry.context ?? null,
      source: entry.source ?? 'marketplace',
    });
    if (error) {
      const message = error.message || '';
      if (
        error.code === 'PGRST205' ||
        message.includes("Could not find the table 'public.audit_logs'") ||
        message.includes('schema cache')
      ) {
        console.info('[audit_logs] tabela não encontrada; seguindo sem persistir auditoria');
        return;
      }

      console.warn('[audit_logs] falha ao gravar', error.message);
    }
  } catch (e) {
    console.warn('[audit_logs] exceção ao gravar', e);
  }
}