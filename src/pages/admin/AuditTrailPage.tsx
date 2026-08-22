import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, History, Search, Download, RefreshCw, Key, Monitor, Palette, Sparkles, User, Coins, Sliders } from "lucide-react";
import { toast } from "sonner";
import { getReligionConfig } from "@/lib/religion-config";

interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action: string;
  category: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export default function AuditTrailPage() {
  const { user, company, religion } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        // If table empty or fresh, fallback to empty array
        setLogs([]);
      } else {
        setLogs((data as AuditLog[]) || []);
      }
    } catch (e) {
      console.warn("Failed to load audit logs:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesCat = categoryFilter === "all" || log.category === categoryFilter;
    const matchesSearch =
      !search ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "auth":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Key className="size-3" /> Auth</span>;
      case "religion":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Sparkles className="size-3" /> Faith</span>;
      case "layouts":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Palette className="size-3" /> Screens</span>;
      case "devices":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Monitor className="size-3" /> Device</span>;
      case "donations":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20"><Coins className="size-3" /> Daan</span>;
      case "access":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"><User className="size-3" /> Access</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20"><Sliders className="size-3" /> Config</span>;
    }
  };

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No records to export");
      return;
    }
    const headers = ["Timestamp", "User Name", "Email", "Category", "Action", "Details"];
    const rows = filteredLogs.map((l) => [
      l.created_at || "",
      `"${l.user_name || ""}"`,
      `"${l.user_email || ""}"`,
      l.category || "",
      `"${l.action || ""}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit log CSV exported!");
  };

  const relMeta = getReligionConfig(religion);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Security & Activity Audit Trail</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Immutable activity log tracking logins, faith configuration changes, layout edits, and screen actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download className="size-3.5" /> Export Log
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-card/40 backdrop-blur-md border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Logged Events</CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">{logs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 backdrop-blur-md border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Active Faith System</CardDescription>
              <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-1.5">
                <span>{relMeta.symbol}</span> {relMeta.shortName}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 backdrop-blur-md border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Auth & Login Events</CardDescription>
              <CardTitle className="text-2xl font-bold text-blue-400">
                {logs.filter((l) => l.category === "auth").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/40 backdrop-blur-md border border-white/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Layout & Screen Edits</CardDescription>
              <CardTitle className="text-2xl font-bold text-purple-400">
                {logs.filter((l) => l.category === "layouts" || l.category === "religion").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-card/40 backdrop-blur-md border border-white/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action, user or details..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background/50 border-white/10"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs w-[160px] bg-background/50 border-white/10">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="auth">Auth & Logins</SelectItem>
                    <SelectItem value="religion">Faith & Religion</SelectItem>
                    <SelectItem value="layouts">Screens & Layouts</SelectItem>
                    <SelectItem value="devices">Devices</SelectItem>
                    <SelectItem value="donations">Donations (Daan)</SelectItem>
                    <SelectItem value="access">Access & Roles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[180px] text-xs">Timestamp</TableHead>
                    <TableHead className="text-xs">User / Admin</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                        <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading activity logs...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                        <History className="size-6 mx-auto mb-2 opacity-40" />
                        No audit records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id || Math.random().toString()} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "Just now"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <div>{log.user_name || "System"}</div>
                          <div className="text-[10px] text-muted-foreground">{log.user_email || "system@local"}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {getCategoryBadge(log.category)}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-foreground">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 max-w-md break-words">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
