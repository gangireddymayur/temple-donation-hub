import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  company: any | null;
  religion: string;
  isTrialExpired: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  updateReligion: (newReligion: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  company: null,
  religion: "hinduism",
  isTrialExpired: false,
  loading: true,
  signOut: async () => {},
  refreshCompany: async () => {},
  updateReligion: async () => false,
});

export function getTrialInfo(company: any) {
  if (!company) {
    return {
      isExpired: false,
      text: "Active",
      expiresAtFormatted: null,
      expiryDate: null,
      variant: "default"
    };
  }

  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === "null") return null;
    const formatted = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    return new Date(formatted);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // 1. Explicitly Active
  if (company.subscription_status === "active") {
    const trialEnd = company.trial_ends_at ? parseDate(company.trial_ends_at) : null;
    if (trialEnd && !isNaN(trialEnd.getTime()) && trialEnd.getTime() > Date.now()) {
      const diff = trialEnd.getTime() - Date.now();
      const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      const formattedExpiry = formatDate(trialEnd);
      return {
        isExpired: false,
        text: "Active",
        expiresAtFormatted: `Expires: ${formattedExpiry}`,
        expiryDate: formattedExpiry,
        variant: "default"
      };
    }
    return {
      isExpired: false,
      text: "Active",
      expiresAtFormatted: "Active",
      expiryDate: null,
      variant: "default"
    };
  }

  // 2. Explicitly Expired
  if (company.subscription_status === "expired") {
    const trialEnd = company.trial_ends_at
      ? parseDate(company.trial_ends_at)
      : company.created_at
        ? (() => {
            const parsed = parseDate(company.created_at);
            return parsed ? new Date(parsed.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
          })()
        : null;
    const formattedExpiry = formatDate(trialEnd);
    return {
      isExpired: true,
      text: "Access Expired",
      expiresAtFormatted: formattedExpiry ? `Expired on ${formattedExpiry}` : "Access Expired",
      expiryDate: formattedExpiry,
      variant: "destructive"
    };
  }

  // 3. Trial Mode (or unconfigured)
  const trialEnd = company.trial_ends_at
    ? parseDate(company.trial_ends_at)
    : company.created_at
      ? (() => {
          const parsed = parseDate(company.created_at);
          return parsed ? new Date(parsed.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
        })()
      : null;

  if (!trialEnd || isNaN(trialEnd.getTime())) {
    return {
      isExpired: false,
      text: "Trial (7d left)",
      expiresAtFormatted: "Trial (7d left)",
      expiryDate: null,
      variant: "warning"
    };
  }

  const diff = trialEnd.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  const isExpired = diff <= 0;
  const formattedExpiry = formatDate(trialEnd);

  if (isExpired) {
    return {
      isExpired: true,
      text: "Trial Expired",
      expiresAtFormatted: `Expired on ${formattedExpiry}`,
      expiryDate: formattedExpiry,
      variant: "destructive"
    };
  }

  return {
    isExpired: false,
    text: `Trial (${days}d left)`,
    expiresAtFormatted: `Trial Ends: ${formattedExpiry}`,
    expiryDate: formattedExpiry,
    variant: "warning"
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [religion, setReligion] = useState<string>("hinduism");
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const refreshCompany = async () => {
    if (!user) return;
    await fetchRoleAndCompany(user);
  };

  const updateReligion = async (newReligion: string): Promise<boolean> => {
    try {
      const companyId = user?.user_metadata?.company_id || company?.id;
      if (companyId) {
        await supabase.from("companies").update({ religion: newReligion }).eq("id", companyId);
      }
      if (user?.id) {
        await supabase.from("profiles").update({ religion: newReligion }).eq("id", user.id);
      }
      setReligion(newReligion);
      if (company) {
        setCompany({ ...company, religion: newReligion });
      }
      try {
        const cached = localStorage.getItem("sh_session");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.user?.user_metadata) {
            parsed.user.user_metadata.religion = newReligion;
            localStorage.setItem("sh_session", JSON.stringify(parsed));
          }
        }
      } catch (e) {}
      return true;
    } catch (e) {
      console.warn("Failed to update religion:", e);
      return false;
    }
  };

  const fetchRoleAndCompany = async (userObj: User) => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userObj.id)
        .single();

      const userRole = (roleData?.role as AppRole) ?? null;
      console.log("[fetchRoleAndCompany] userRole:", userRole);
      setRole(userRole);

      const companyId = userObj.user_metadata?.company_id;
      console.log("[fetchRoleAndCompany] companyId:", companyId);
      if (companyId) {
        const { data: compData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();
        console.log("[fetchRoleAndCompany] compData:", JSON.stringify(compData));
        setCompany(compData ?? null);
        if (compData?.religion) {
          setReligion(compData.religion);
        } else if (userObj.user_metadata?.religion) {
          setReligion(userObj.user_metadata.religion);
        }
        const trialInfo = getTrialInfo(compData);
        console.log("[fetchRoleAndCompany] trialInfo:", JSON.stringify(trialInfo));
        setIsTrialExpired(userRole === "super_admin" ? false : trialInfo.isExpired);
      } else {
        setCompany(null);
        if (userObj.user_metadata?.religion) {
          setReligion(userObj.user_metadata.religion);
        }
        setIsTrialExpired(false);
      }
    } catch {
      setRole(null);
      setCompany(null);
      setIsTrialExpired(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        initialized.current = true;
      }
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoleAndCompany(session.user);
      }
      setLoading(false);
      initialized.current = true;
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
      initialized.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!initialized.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRoleAndCompany(session.user);
        } else {
          setRole(null);
          setCompany(null);
          setIsTrialExpired(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setCompany(null);
    setIsTrialExpired(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, company, religion, isTrialExpired, loading, signOut, refreshCompany, updateReligion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
