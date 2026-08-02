import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HeartHandshake, Sparkles, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070913] relative overflow-hidden p-4 font-sans select-none">
      {/* Decorative backdrop glowing blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-[#0d1020]/90 border border-slate-800/80 shadow-2xl rounded-3xl backdrop-blur-xl relative z-10 overflow-hidden">
        {/* Subtle top amber border highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <CardHeader className="text-center space-y-3.5 pt-8 pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/25 relative group">
            <HeartHandshake className="h-7 w-7 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-300 animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent tracking-tight">
              Temple Donation Hub
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Devasthanam Administration Console
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-7 pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
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
              <Label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
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
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <span>Sign In to Console</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center gap-1 text-[10px] text-slate-500">
            <span className="uppercase tracking-widest font-bold text-orange-500/80">Secured Deployment</span>
            <span>Happy Shamir Plesk Node Service</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
