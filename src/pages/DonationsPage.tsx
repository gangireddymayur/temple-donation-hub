import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, HeartHandshake, CheckCircle2, AlertCircle, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DonationRecord {
  id: string;
  donor_name: string;
  donor_phone: string;
  amount: number;
  purpose: string;
  payment_status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Analytics
  const [totalDaan, setTotalDaan] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const { data, error } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
        if (data && !error) {
          const list = data as DonationRecord[];
          setDonations(list);
          
          // Calculate stats
          const successList = list.filter(d => d.payment_status === 'success');
          const total = successList.reduce((sum, d) => sum + Number(d.amount), 0);
          setTotalDaan(total);
          setSuccessCount(successList.length);
          setPendingCount(list.filter(d => d.payment_status === 'pending').length);
        }
      } catch (e) {
        console.error("Failed to load donations:", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDonations();
    const interval = setInterval(fetchDonations, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const filtered = donations.filter(d => 
    (d.donor_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.purpose || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.donor_phone || "").includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daan Offerings</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time donation tracking and payouts</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Total Daan Collected</CardTitle>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">₹{totalDaan.toLocaleString("en-IN")}</div>
              <p className="text-xs text-muted-foreground mt-1">From successful UPI/Razorpay offerings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Successful Offerings</CardTitle>
              <HeartHandshake className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{successCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Devotee payments completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Pending Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Initiated scans awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Transactions Log</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search donor or purpose..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading transaction history...
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Devotee Name</TableHead>
                      <TableHead>Mobile Phone</TableHead>
                      <TableHead>Campaign / Purpose</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-mono">
                          {new Date(d.created_at).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{d.donor_name || "Anonymous Devotee"}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{d.donor_phone || "—"}</TableCell>
                        <TableCell className="text-xs">
                          <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400">
                            {d.purpose}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold font-mono">
                          ₹{Number(d.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.payment_status === 'success' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              Success
                            </span>
                          )}
                          {d.payment_status === 'pending' && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              Pending
                            </span>
                          )}
                          {d.payment_status === 'failed' && (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              Failed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
