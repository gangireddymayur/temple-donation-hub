import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HeartHandshake, Sparkles, Lock, Mail, Loader2, User, Building2, CheckCircle2, ShieldCheck, LogIn, UserPlus, Gift } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALL_RELIGIONS, ReligionType, getReligionConfig } from "@/lib/religion-config";
import { logAudit } from "@/lib/audit-logger";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  
  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Sign Up state
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [selectedReligion, setSelectedReligion] = useState<ReligionType>("hinduism");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session, role, loading: authLoading } = useAuth();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && session) {
      navigate(role === "admin" ? "/admin" : "/", { replace: true });
    }
  }, [session, authLoading, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const religionMeta = getReligionConfig(selectedReligion);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: orgName || `${fullName}'s ${religionMeta.terminology.institutionType}`,
          religion: selectedReligion,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Account created for ${religionMeta.name}!`);
      await logAudit(
        "AUTH_SIGNUP",
        "auth",
        `New account registered: ${fullName} (${religionMeta.name})`
      );
      navigate("/admin", { replace: true });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
          <HeartHandshake className="absolute h-4 w-4 text-orange-400 animate-pulse" />
        </div>
      </div>
    );
  }

  const activeReligionMeta = getReligionConfig(selectedReligion);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070913] relative overflow-y-auto py-10 px-4 font-sans select-none">
      {/* Decorative backdrop glowing blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-xl bg-[#0d1020]/95 border border-slate-800 shadow-2xl rounded-3xl backdrop-blur-xl relative z-10 overflow-hidden my-auto">
        {/* Subtle top amber/orange border highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />

        <CardHeader className="text-center space-y-3.5 pt-8 pb-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/25 relative group">
            <HeartHandshake className="h-7 w-7 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-300 animate-bounce" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent tracking-tight">
              Temple & Signage Donation Hub
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400">
              Universal Devotional & Digital Signage Cloud
            </CardDescription>
          </div>

          {/* High-End Segmented Slider Switcher */}
          <div className="relative flex p-1 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner max-w-sm mx-auto mt-3 select-none">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={cn(
                "relative z-10 flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5",
                tab === "signin"
                  ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              )}
            >
              <LogIn className="size-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={cn(
                "relative z-10 flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5",
                tab === "signup"
                  ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              )}
            >
              <UserPlus className="size-3.5" />
              <span>Create Account</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400/25 text-amber-300 font-extrabold border border-amber-400/40">
                7d Free
              </span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-2">
          {tab === "signin" ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@temple.org"
                    className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl pl-10 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50 placeholder-slate-600 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <Label htmlFor="signin-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl pl-10 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50 placeholder-slate-600 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <span>Sign In to Console</span>}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  New institution or temple?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("signup")}
                    className="text-orange-400 font-bold hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* ================= CREATE ACCOUNT FORM ================= */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* 7-Day Free Trial Welcome Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/25 flex items-center gap-3">
                <div className="size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Gift className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-amber-300">7-Day Free Trial Included</p>
                  <p className="text-[10px] text-slate-400">Instantly creates your sanctuary account with full multi-faith and digital signage capabilities.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="signup-name" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                    Your Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full h-10 bg-slate-900/60 border border-slate-800 rounded-xl pl-9 text-sm text-slate-200 focus:border-orange-500/50 placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-org" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                    Institution / Center Name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="signup-org"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Sri Venkateswara Temple"
                      className="w-full h-10 bg-slate-900/60 border border-slate-800 rounded-xl pl-9 text-sm text-slate-200 focus:border-orange-500/50 placeholder-slate-600"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* RELIGION SELECTION GRID */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between pl-1">
                  <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Select Your Religion & Faith System
                  </Label>
                  <span className="text-[10px] text-slate-400">Templates adapt dynamically</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  {ALL_RELIGIONS.map((rel) => {
                    const isSelected = selectedReligion === rel.id;
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => setSelectedReligion(rel.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-left transition-all relative ${
                          isSelected
                            ? `${rel.borderClass} ${rel.badgeClass} ring-1 ring-orange-500/60 shadow-md`
                            : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <span className="text-xl mb-1">{rel.symbol}</span>
                        <span className="text-xs font-bold truncate w-full text-center">{rel.shortName}</span>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 absolute top-1 right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Religion Preview Banner */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeReligionMeta.symbol}</span>
                    <div>
                      <div className="font-bold text-slate-200">{activeReligionMeta.name}</div>
                      <div className="text-[10px] text-slate-400">{activeReligionMeta.tagline}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
                    {activeReligionMeta.terminology.donationName}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@temple.org"
                    className="w-full h-10 bg-slate-900/60 border border-slate-800 rounded-xl pl-9 text-sm text-slate-200 focus:border-orange-500/50 placeholder-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="signup-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 bg-slate-900/60 border border-slate-800 rounded-xl pl-9 text-sm text-slate-200 focus:border-orange-500/50 placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-confirm-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 bg-slate-900/60 border border-slate-800 rounded-xl pl-9 text-sm text-slate-200 focus:border-orange-500/50 placeholder-slate-600"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <span>Create Account & Setup Hub</span>}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("signin")}
                    className="text-orange-400 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Multi-Faith & Devotional SaaS
            </span>
            <span>Happy Shamir Plesk Node Service</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
