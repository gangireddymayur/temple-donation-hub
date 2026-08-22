import { supabase } from "@/integrations/supabase/client";

export type AuditCategory = 'auth' | 'access' | 'religion' | 'layouts' | 'devices' | 'settings' | 'donations' | 'system';

export interface AuditLogItem {
  id?: string;
  company_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  action: string;
  category: AuditCategory;
  details?: string;
  ip_address?: string;
  created_at?: string;
}

export async function logAudit(
  _action: string,
  _category: AuditCategory,
  _details: string,
  _extra?: { companyId?: string; userEmail?: string; userName?: string; userId?: string }
) {
  // Audit logging disabled
  return;
}
