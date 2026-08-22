import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, ClipboardList, Settings, HeartHandshake, IndianRupee, HelpCircle, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getReligionConfig } from "@/lib/religion-config";

interface DonationRecord {
  id: string;
  donor_name: string;
  donor_phone: string;
  donor_email: string;
  donor_address: string;
  donor_city: string;
  donor_state: string;
  donor_pincode: string;
  donor_gotra: string;
  donor_nakshatra: string;
  special_prayer: string;
  kiosk_name: string;
  amount: number;
  purpose: string;
  payment_status: 'pending' | 'success' | 'failed';
  razorpay_order_id: string;
  razorpay_payment_id: string;
  created_at: string;
}

interface FormFieldConfig {
  enabled: boolean;
  required: boolean;
}

interface CustomerInfoConfig {
  popupEnabled: boolean;
  fields: {
    name: FormFieldConfig;
    phone: FormFieldConfig;
    email: FormFieldConfig;
    address: FormFieldConfig;
    city: FormFieldConfig;
    state: FormFieldConfig;
    pincode: FormFieldConfig;
    gotra: FormFieldConfig;
    nakshatra: FormFieldConfig;
    purpose: FormFieldConfig;
    prayer: FormFieldConfig;
  };
}

const DEFAULT_FORM_CONFIG: CustomerInfoConfig = {
  popupEnabled: true,
  fields: {
    name: { enabled: true, required: true },
    phone: { enabled: true, required: true },
    email: { enabled: true, required: false },
    address: { enabled: false, required: false },
    city: { enabled: false, required: false },
    state: { enabled: false, required: false },
    pincode: { enabled: false, required: false },
    gotra: { enabled: true, required: false },
    nakshatra: { enabled: true, required: false },
    purpose: { enabled: true, required: false },
    prayer: { enabled: true, required: false },
  }
};

export default function DonationsContentPage() {
  const { user, religion } = useAuth();
  const relMeta = getReligionConfig(religion);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Donations logs list
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Stats
  const [totalCollected, setTotalCollected] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  const fetchLogs = async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("company_id", cid)
        .order("created_at", { ascending: false });
      if (data && !error) {
        const records = data as DonationRecord[];
        setDonations(records);
        
        // Stats calculations
        const successRows = records.filter(r => r.payment_status === "success");
        setTotalCollected(successRows.reduce((sum, r) => sum + Number(r.amount), 0));
        setSuccessCount(successRows.length);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          await fetchLogs(profile.company_id);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Date Preset Handler
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
      setFromDate(start);
      setToDate(start);
    } else if (preset === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const end = now.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const end = now.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const end = now.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(end);
    }
  };

  // Filters and searches (Default latest first)
  const filtered = donations.filter(d => {
    const matchesSearch = 
      (d.donor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.donor_phone || "").includes(search) ||
      (d.donor_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.purpose || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.kiosk_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.razorpay_payment_id || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || d.payment_status === statusFilter;

    let matchesDate = true;
    if (fromDate) {
      const donationDate = new Date(d.created_at).toISOString().split("T")[0];
      if (donationDate < fromDate) matchesDate = false;
    }
    if (toDate) {
      const donationDate = new Date(d.created_at).toISOString().split("T")[0];
      if (donationDate > toDate) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedDonations = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Date/Time", "Devotee Name", "Phone", "Email", "Address", "City", "State", "Pincode",
      "Gotra", "Nakshatra", "Purpose", "Amount", "Kiosk Name", "Order ID", "Payment ID", "Status"
    ];

    const rows = filtered.map(d => [
      new Date(d.created_at).toLocaleString("en-IN"),
      d.donor_name || "Anonymous",
      d.donor_phone || "",
      d.donor_email || "",
      d.donor_address || "",
      d.donor_city || "",
      d.donor_state || "",
      d.donor_pincode || "",
      d.donor_gotra || "",
      d.donor_nakshatra || "",
      d.purpose,
      d.amount,
      d.kiosk_name || "",
      d.razorpay_order_id || "",
      d.razorpay_payment_id || "",
      d.payment_status
    ]);

    const csvContent = "\uFEFF" // UTF-8 BOM for Excel formatting support
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `temple_donations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{relMeta.symbol}</span>
              <h1 className="text-2xl font-bold tracking-tight">{relMeta.shortName} {relMeta.terminology.donationName} Management</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Configure {relMeta.terminology.devoteeName} details fields and view consolidated transaction history for {relMeta.name}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => companyId && fetchLogs(companyId)} className="h-9">
              Refresh Logs
            </Button>
            <Button size="sm" onClick={handleExportCSV} className="h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Total {relMeta.terminology.donationName}</CardTitle>
              <IndianRupee className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">₹{totalCollected.toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Devotee Checkout Scans</CardTitle>
              <HeartHandshake className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">{successCount} successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Initiated Scans</CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">{donations.length} total</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-amber-500" />
            <span>Loading donation settings & logs...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Donation Logs */}
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <HeartHandshake className="size-4 text-primary" /> Consolidated Devotee Offerings
                    </CardTitle>
                    <CardDescription>
                      Consolidated real-time transaction ledger including devotee details and kiosk device origins.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={filtered.length === 0}
                      className="border-primary/30 text-primary hover:bg-primary/10 h-8 text-xs font-semibold"
                    >
                      <Download className="size-3.5 mr-1.5" /> Export CSV ({filtered.length})
                    </Button>
                  </div>
                </div>

                {/* Filters & Date Range Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search devotee, phone, order ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="pl-8 h-8 text-xs bg-slate-950/40 border-border/60"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 w-32 bg-slate-950/40 border-border/60 text-xs">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Date Presets */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40 text-xs">
                      {[
                        { id: "all", label: "All Time" },
                        { id: "today", label: "Today" },
                        { id: "7days", label: "7 Days" },
                        { id: "30days", label: "30 Days" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleDatePreset(p.id)}
                          className={cn(
                            "px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
                            datePreset === p.id
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* From & To Custom Date Inputs */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">From:</span>
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setDatePreset("custom");
                          setCurrentPage(1);
                        }}
                        className="h-8 text-xs w-32 bg-slate-950/40 border-border/60"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">To:</span>
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setDatePreset("custom");
                          setCurrentPage(1);
                        }}
                        className="h-8 text-xs w-32 bg-slate-950/40 border-border/60"
                      />
                    </div>
                    {(fromDate || toDate || statusFilter !== "all" || search) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                          handleDatePreset("all");
                        }}
                        className="h-8 text-[11px] text-muted-foreground hover:text-foreground px-2"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-x-auto">
                  <Table className="min-w-[1200px]">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[140px]">Date / Time</TableHead>
                        <TableHead>Devotee</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Gotra & Nakshatra</TableHead>
                        <TableHead>Devotee Address</TableHead>
                        <TableHead>Offering Purpose</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Kiosk Name</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDonations.map((d) => (
                        <TableRow key={d.id} className="hover:bg-muted/10">
                          <TableCell className="text-[11px] font-mono whitespace-nowrap">
                            {new Date(d.created_at).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-200">
                            {d.donor_name || "Anonymous Devotee"}
                            {d.special_prayer && (
                              <p className="text-[10px] text-amber-500 font-normal italic mt-0.5">
                                Prayer: "{d.special_prayer}"
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] space-y-0.5">
                            <p className="font-mono text-muted-foreground">{d.donor_phone || "—"}</p>
                            {d.donor_email && <p className="text-slate-500 truncate max-w-[150px]">{d.donor_email}</p>}
                          </TableCell>
                          <TableCell className="text-[11px]">
                            {d.donor_gotra || d.donor_nakshatra ? (
                              <div className="space-y-0.5">
                                {d.donor_gotra && <p className="text-slate-300">Gotra: {d.donor_gotra}</p>}
                                {d.donor_nakshatra && <p className="text-slate-400">Star: {d.donor_nakshatra}</p>}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-400 max-w-[150px] truncate">
                            {d.donor_address || d.donor_city ? (
                              <span>
                                {d.donor_address}
                                {d.donor_city && `, ${d.donor_city}`}
                                {d.donor_state && ` (${d.donor_state})`}
                                {d.donor_pincode && ` - ${d.donor_pincode}`}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400">
                              {d.purpose}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-black font-mono text-amber-500">
                            ₹{Number(d.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{d.kiosk_name || "—"}</TableCell>
                          <TableCell className="text-[11px] font-mono text-slate-500 max-w-[120px] truncate" title={d.razorpay_payment_id || d.razorpay_order_id}>
                            {d.razorpay_payment_id || d.razorpay_order_id || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {d.payment_status === 'success' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                Success
                              </span>
                            )}
                            {d.payment_status === 'pending' && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                Pending
                              </span>
                            )}
                            {d.payment_status === 'failed' && (
                              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                Failed
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                            No donations found matching criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Numbered Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 mt-2">
                    <span className="text-xs text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} transactions
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2.5 text-xs"
                      >
                        Previous
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Display sliding window of page numbers
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                        ) {
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={cn(
                                "h-8 w-8 p-0 text-xs font-mono",
                                currentPage === pageNum ? "bg-primary text-primary-foreground font-bold" : ""
                              )}
                            >
                              {pageNum}
                            </Button>
                          );
                        } else if (
                          pageNum === currentPage - 3 ||
                          pageNum === currentPage + 3
                        ) {
                          return <span key={pageNum} className="text-xs text-muted-foreground px-1">...</span>;
                        }
                        return null;
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2.5 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
