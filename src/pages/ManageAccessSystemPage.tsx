import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Zap,
  Building2,
  Monitor,
  Infinity,
  Sparkles,
  Lock,
  Unlock,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { getReligionConfig } from "@/lib/religion-config";
import { logAudit } from "@/lib/audit-logger";

interface CompanyAccessRecord {
  id: string;
  name: string;
  contact_email: string;
  plan: string;
  max_screens: number;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  religion?: string;
  local_mode?: string;
  created_at: string;
}

export default function ManageAccessSystemPage() {
  const [companies, setCompanies] = useState<CompanyAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Access Modal
  const [accessOpen, setAccessOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<CompanyAccessRecord | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [selectedScreens, setSelectedScreens] = useState("10");
  const [selectedSubStatus, setSelectedSubStatus] = useState("active");
  const [customEndDate, setCustomEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCompanies((data as CompanyAccessRecord[]) || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAccessModal = (comp: CompanyAccessRecord) => {
    setSelectedComp(comp);
    setSelectedPlan(comp.plan || "pro");
    setSelectedScreens(String(comp.max_screens || 10));
    setSelectedSubStatus(comp.subscription_status || "active");
    setCustomEndDate(comp.trial_ends_at ? comp.trial_ends_at.slice(0, 16) : "");
    setAccessOpen(true);
  };

  // Helper to calculate and apply preset durations
  const applyPresetDuration = async (durationMonths: number, label: string) => {
    if (!selectedComp) return;
    setSubmitting(true);

    const now = new Date();
    let newEndDate: string | null = null;
    let newStatus = "active";

    if (durationMonths === -1) {
      // Lifetime access
      newEndDate = null;
      newStatus = "active";
    } else if (durationMonths === 0.25) {
      // 7 days trial
      const d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      newEndDate = d.toISOString();
      newStatus = "trial";
    } else {
      // Add months
      const d = new Date();
      d.setMonth(d.getMonth() + durationMonths);
      newEndDate = d.toISOString();
      newStatus = "active";
    }

    try {
      const { error } = await supabase.from("companies").update({
        subscription_status: newStatus,
        trial_ends_at: newEndDate,
        status: "active",
      }).eq("id", selectedComp.id);

      if (error) throw error;

      toast.success(`Granted ${label} to ${selectedComp.name}!`);
      await logAudit(
        "GRANT_ACCESS",
        "access",
        `Granted ${label} (status: ${newStatus}, expiry: ${newEndDate || "Lifetime"}) to ${selectedComp.name}`,
        { companyId: selectedComp.id }
      );

      setAccessOpen(false);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || "Failed to update access");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCustomAccess = async () => {
    if (!selectedComp) return;
    setSubmitting(true);

    try {
      const payload: any = {
        plan: selectedPlan,
        max_screens: parseInt(selectedScreens) || 10,
        subscription_status: selectedSubStatus,
        status: selectedSubStatus === "expired" ? "suspended" : "active",
        trial_ends_at: customEndDate ? new Date(customEndDate).toISOString() : null,
      };

      const { error } = await supabase.from("companies").update(payload).eq("id", selectedComp.id);
      if (error) throw error;

      toast.success(`Access configurations saved for ${selectedComp.name}!`);
      await logAudit(
        "UPDATE_ACCESS_CONFIG",
        "access",
        `Updated access rules for ${selectedComp.name}: Plan=${selectedPlan}, Screens=${selectedScreens}, Status=${selectedSubStatus}`,
        { companyId: selectedComp.id }
      );

      setAccessOpen(false);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || "Failed to save access");
    } finally {
      setSubmitting(false);
    }
  };

  const getAccessBadge = (comp: CompanyAccessRecord) => {
    if (comp.subscription_status === "active" && !comp.trial_ends_at) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
          <Infinity className="size-3" /> Lifetime Access
        </Badge>
      );
    }

    if (comp.subscription_status === "expired") {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Access Expired
        </Badge>
      );
    }

    if (!comp.trial_ends_at) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
          Active
        </Badge>
      );
    }

    const end = new Date(comp.trial_ends_at).getTime();
    const diff = end - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Expired ({Math.abs(days)}d ago)
        </Badge>
      );
    }

    if (days <= 7) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
          {days} Days Left
        </Badge>
      );
    }

    if (days > 180) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] gap-1">
          <Sparkles className="size-3" /> {Math.round(days / 30)} Months Access
        </Badge>
      );
    }

    return (
      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
        {days} Days Active
      </Badge>
    );
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return c.status === "active";
    if (filterStatus === "expired") return c.subscription_status === "expired";
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Super Admin Manage Access System</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Grant and manage temple subscriptions: 1 Month, 6 Months, 1 Year, 2 Years or Lifetime access, with screen limits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-card/40 border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Registered Temples</CardDescription>
              <CardTitle className="text-2xl font-bold">{companies.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Active Subscriptions</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-400">
                {companies.filter((c) => c.status === "active" && c.subscription_status !== "expired").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Expired Access</CardDescription>
              <CardTitle className="text-2xl font-bold text-rose-400">
                {companies.filter((c) => c.subscription_status === "expired").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Screens Granted</CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-400">
                {companies.reduce((sum, c) => sum + (c.max_screens || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Table & Filter */}
        <Card className="bg-card/40 border border-white/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search temple or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background/50 border-white/10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-background/50 border-white/10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  <SelectItem value="active">Active Access</SelectItem>
                  <SelectItem value="expired">Expired Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="text-xs">Temple / Organization</TableHead>
                    <TableHead className="text-xs">Faith / Religion</TableHead>
                    <TableHead className="text-xs">Plan & Screens</TableHead>
                    <TableHead className="text-xs">Access Status</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs text-right">Access Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading access records...
                      </TableCell>
                    </TableRow>
                  ) : filteredCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs">
                        No organizations found matching search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanies.map((c) => {
                      const relMeta = getReligionConfig(c.religion);
                      return (
                        <TableRow key={c.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="text-xs font-medium">
                            <div className="font-bold text-foreground">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.contact_email}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/5 text-slate-300">
                              <span>{relMeta.symbol}</span> {relMeta.shortName}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-mono font-bold capitalize text-primary">{c.plan || "Pro"}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Monitor className="size-3" /> Max {c.max_screens || 10} Screens
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {getAccessBadge(c)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {c.trial_ends_at
                              ? new Date(c.trial_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : "Permanent / Lifetime"}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <Button
                              size="sm"
                              onClick={() => openAccessModal(c)}
                              className="h-8 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
                            >
                              <Zap className="size-3.5 mr-1.5" /> Manage Access
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MANAGE ACCESS MODAL */}
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Manage Access & Subscriptions
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Grant access duration, plan limits & screens for <span className="text-foreground font-semibold">{selectedComp?.name}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* 1-CLICK GRANT DURATION PRESETS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  ⚡ 1-Click Grant Access Duration
                </Label>
                <span className="text-[10px] text-muted-foreground">Instantly extends entitlement</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(1, "1 Month Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-background/50 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-left"
                >
                  <div className="font-bold text-xs text-foreground">1 Month Access</div>
                  <div className="text-[10px] text-muted-foreground">+30 Days Plan</div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(3, "3 Months Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-background/50 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-left"
                >
                  <div className="font-bold text-xs text-foreground">3 Months Access</div>
                  <div className="text-[10px] text-muted-foreground">Quarterly Plan</div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(6, "6 Months Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-background/50 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-left"
                >
                  <div className="font-bold text-xs text-amber-400">6 Months Access</div>
                  <div className="text-[10px] text-muted-foreground">Half-Year Plan</div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(12, "1 Year Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 text-left"
                >
                  <div className="font-bold text-xs text-amber-400 flex items-center gap-1">
                    <Sparkles className="size-3" /> 1 Year Access
                  </div>
                  <div className="text-[10px] text-muted-foreground">Annual Full Access</div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(24, "2 Years Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-background/50 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-left"
                >
                  <div className="font-bold text-xs text-foreground">2 Years Access</div>
                  <div className="text-[10px] text-muted-foreground">Biennial Plan</div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => applyPresetDuration(-1, "Lifetime Unlimited Access")}
                  className="h-12 flex-col items-start justify-center p-2.5 bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20 text-left"
                >
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <Infinity className="size-3" /> Lifetime Access
                  </div>
                  <div className="text-[10px] text-muted-foreground">No Expiry Limit</div>
                </Button>
              </div>
            </div>

            {/* CUSTOM SETTINGS FORM */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                ⚙️ Custom Access & Screen Limits
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Plan Tier</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="bg-background/80 border-white/10 text-xs h-9">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter Plan (Single Screen)</SelectItem>
                      <SelectItem value="pro">Pro Plan (Multi-Screen & Split)</SelectItem>
                      <SelectItem value="enterprise">Enterprise Devasthanam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Max Screen Allocation</Label>
                  <Input
                    type="number"
                    value={selectedScreens}
                    onChange={(e) => setSelectedScreens(e.target.value)}
                    placeholder="10"
                    className="bg-background/80 border-white/10 text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Subscription Status</Label>
                  <Select value={selectedSubStatus} onValueChange={setSelectedSubStatus}>
                    <SelectTrigger className="bg-background/80 border-white/10 text-xs h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Paid)</SelectItem>
                      <SelectItem value="trial">Free Trial</SelectItem>
                      <SelectItem value="expired">Expired / Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Specific Expiry Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-background/80 border-white/10 text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => applyPresetDuration(0, "Expired Access")}
                disabled={submitting}
                className="text-xs"
              >
                <Lock className="size-3.5 mr-1" /> Lock / Revoke Access
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAccessOpen(false)}
                  className="text-xs border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustomAccess}
                  disabled={submitting}
                  className="text-xs font-bold bg-primary hover:bg-primary/90"
                >
                  {submitting ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
