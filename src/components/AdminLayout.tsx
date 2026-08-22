import { forwardRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, Search, AlertTriangle, ShieldAlert, ShieldCheck, Clock, MessageSquare, ExternalLink, LogOut, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth, getTrialInfo } from "@/hooks/useAuth";
import { getReligionConfig } from "@/lib/religion-config";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const AdminLayout = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const { role, company, religion, isTrialExpired, signOut, refreshCompany } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const trialInfo = getTrialInfo(company);
    const relMeta = getReligionConfig(religion);

    const handleRefreshAccess = async () => {
      try {
        setSyncing(true);
        await refreshCompany();
        toast.success("Access data & subscription status refreshed!");
      } catch {
        toast.error("Failed to refresh status");
      } finally {
        setSyncing(false);
      }
    };

    const isEditorPage = location.pathname.startsWith("/admin/layouts/") && location.pathname !== "/admin/layouts";

    return (
      <SidebarProvider defaultOpen={!isEditorPage}>
        <div ref={ref} className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search devices, content..."
                    className="w-64 pl-9 h-9 bg-muted/50 border-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Top-Bar License Expiration Indicator */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/70 border border-white/10 text-xs font-medium select-none shadow-sm backdrop-blur-md">
                  {company?.subscription_status === "active" && !trialInfo.isExpired ? (
                    <>
                      <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">Active</span>
                        {trialInfo.expiresAtFormatted && (
                          <span className="text-muted-foreground font-mono text-[11px] border-l border-white/10 pl-1.5">
                            {trialInfo.expiresAtFormatted}
                          </span>
                        )}
                      </div>
                    </>
                  ) : trialInfo.isExpired ? (
                    <>
                      <AlertTriangle className="size-3.5 text-rose-400 shrink-0 animate-pulse" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-400 font-bold">Access Expired</span>
                        {trialInfo.expiryDate && (
                          <span className="text-rose-300/70 font-mono text-[11px] border-l border-rose-500/20 pl-1.5">
                            {trialInfo.expiresAtFormatted}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="size-3.5 text-amber-400 shrink-0" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold">{trialInfo.text}</span>
                        {trialInfo.expiryDate && (
                          <span className="text-muted-foreground font-mono text-[11px] border-l border-white/10 pl-1.5">
                            {trialInfo.expiresAtFormatted}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Refresh Access Data Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRefreshAccess}
                  disabled={syncing}
                  className="size-8 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer shrink-0 transition-all active:scale-95"
                  title="Refresh subscription access data"
                >
                  <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-primary" : ""}`} />
                </Button>

                <ThemeToggle />
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                </Button>
                <div
                  className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-sm font-bold text-primary shadow-sm hover:scale-105 transition-all select-none cursor-default"
                  title={`${relMeta.name} (${relMeta.shortName})`}
                >
                  {relMeta.symbol || "🕉️"}
                </div>
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              {isTrialExpired && role !== "super_admin" && location.pathname !== "/admin/settings" ? (
                /* FULL BLOCKING TRIAL EXPIRED SCREEN */
                <div className="flex-1 min-h-[70vh] grid place-items-center p-4 select-none">
                  <div className="w-full max-w-md bg-card/70 backdrop-blur-2xl rounded-3xl p-8 border border-rose-500/30 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 grid place-items-center text-rose-400 mx-auto animate-bounce">
                      <Lock className="size-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="inline-flex px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                        7-Day Free Trial Expired
                      </div>
                      <h2 className="text-xl font-black text-rose-200">Access Period Ended</h2>
                      <p className="text-xs text-rose-300/80 leading-relaxed max-w-sm mx-auto">
                        Your free trial has ended. To continue managing donation kiosks, digital signage playlists, and TV screens, please contact your administrator or engineering support to renew your subscription.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <a
                        href="https://wa.me/9490468368"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <MessageSquare className="size-4" />
                        Unlock via WhatsApp Support (+91 9490468368)
                        <ExternalLink className="size-3.5" />
                      </a>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          toast.loading("Checking subscription status...");
                          await refreshCompany();
                          toast.dismiss();
                        }}
                        className="w-full h-10 text-xs font-semibold border-white/10 hover:bg-white/5"
                      >
                        <RefreshCw className="size-3.5 mr-2" />
                        Re-check Subscription Status
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await signOut();
                          window.location.href = "/login";
                        }}
                        className="w-full h-9 text-xs text-muted-foreground hover:text-rose-300 hover:bg-white/5 cursor-pointer mt-1"
                      >
                        <LogOut className="size-3.5 mr-2" />
                        Sign Out Account
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {isTrialExpired && role !== "super_admin" && (
                    <div className="bg-destructive/15 border border-destructive/30 rounded-xl p-4 text-destructive flex items-center justify-between gap-4 mb-6 select-none">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-destructive/20 grid place-items-center text-destructive shrink-0 font-bold">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <span>7-Day Free Trial Expired</span>
                            <span className="text-[10px] bg-destructive/30 text-destructive-foreground px-2 py-0.5 rounded-full font-bold">Limit Reached</span>
                          </div>
                          <div className="text-xs opacity-90 mt-0.5">
                            Your 7-day free trial period has ended. Please contact your system administrator to grant full access for your account.
                          </div>
                        </div>
                      </div>
                      <a
                        href="https://wa.me/9490468368"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold bg-destructive/20 px-3 py-1.5 rounded-lg border border-destructive/40 shrink-0 hover:bg-destructive/30 transition-colors inline-flex items-center gap-1.5 text-rose-200"
                      >
                        <MessageSquare className="size-3.5" /> WhatsApp Support
                      </a>
                    </div>
                  )}
                  {children}
                </>
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }
);

AdminLayout.displayName = "AdminLayout";
