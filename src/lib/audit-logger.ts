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
  action: string,
  category: AuditCategory,
  details: string,
  extra?: { companyId?: string; userEmail?: string; userName?: string; userId?: string }
) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    
    const companyId = extra?.companyId || currentUser?.user_metadata?.company_id || null;
    const userId = extra?.userId || currentUser?.id || null;
    const userEmail = extra?.userEmail || currentUser?.email || 'anonymous';
    const userName = extra?.userName || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User';

    const payload: AuditLogItem = {
      company_id: companyId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      action,
      category,
      details,
    };

    // Attempt to write to audit_logs table via supabase client
    await supabase.from("audit_logs").insert(payload);
  } catch (err) {
    console.warn("[audit-logger] Failed to record audit log:", err);
  }
}
