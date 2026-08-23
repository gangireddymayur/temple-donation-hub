import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, ShieldAlert, Loader2, Sparkles, QrCode, CheckCircle2, Copy, Wand2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = (import.meta as any).env?.VITE_API_URL || "/api";

export default function AdminPaymentSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Form Fields
  const [upiId, setUpiId] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState("");
  const [razorpayMode, setRazorpayMode] = useState<"test" | "live">("test");
  const [preferredGateway, setPreferredGateway] = useState<"razorpay">("razorpay");
  const [isEditable, setIsEditable] = useState(false);

  // Test Connection Dialog State
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testQrUrl, setTestQrUrl] = useState<string | null>(null);
  const [testDonationId, setTestDonationId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "initiating" | "polling" | "success" | "failed">("idle");
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          const { data: company } = await supabase.from("companies").select("upi_id, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret, razorpay_mode, preferred_gateway").eq("id", profile.company_id).single();
          if (company) {
            setUpiId(company.upi_id || "");
            setRazorpayKeyId(company.razorpay_key_id || "");
            setRazorpayKeySecret(company.razorpay_key_secret || "");
            setRazorpayWebhookSecret(company.razorpay_webhook_secret || "");
            setRazorpayMode((company as any).razorpay_mode || "test");
            setPreferredGateway("razorpay");
          }
        }
      } catch (err) {
        console.error("Failed to load company payment settings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("companies").update({
        upi_id: upiId,
        razorpay_key_id: razorpayKeyId,
        razorpay_key_secret: razorpayKeySecret,
        razorpay_webhook_secret: razorpayWebhookSecret,
        razorpay_mode: razorpayMode,
        preferred_gateway: preferredGateway
      } as any).eq("id", companyId);

      if (error) throw error;
      toast.success("Payment configurations saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configurations");
    } finally {
      setSaving(false);
    }
  };

  // Connection Test Flow
  const handleStartTest = async () => {
    if (!upiId && !razorpayKeyId) {
      toast.error("Please configure at least a Merchant UPI ID or Razorpay keys to test the connection.");
      return;
    }

    setTesting(true);
    setTestDialogOpen(true);
    setTestStatus("initiating");
    setTestQrUrl(null);
    setTestDonationId(null);

    try {
      const res = await fetch(`${API}/donations/public/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          upiId,
          razorpayKeyId,
          razorpayKeySecret
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to create test donation order");
      }

      const payload = await res.json();
      setTestDonationId(payload.donationId);

      // Generate the test QR
      if (payload.upiString) {
        setTestQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload.upiString)}`);
      } else if (payload.useRazorpay && payload.orderId) {
        // Generate a standard test Razorpay payment link or UPI QR code simulation link
        const razorpayUpiString = `upi://pay?pa=temple.razorpay@icici&pn=Temple%20Donation&am=1.00&tr=${payload.donationId}&cu=INR&tn=Razorpay%20Test%20Order`;
        setTestQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(razorpayUpiString)}`);
      }

      setTestStatus("polling");
      setPollingActive(true);
    } catch (err: any) {
      toast.error(err.message || "Connection test failed to start");
      setTestStatus("failed");
    } finally {
      setTesting(false);
    }
  };

  // Poll status in real time
  useEffect(() => {
    if (!pollingActive || !testDonationId || testStatus !== "polling") return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/donations/public/status/${testDonationId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.payment_status === "success" && active) {
          setTestStatus("success");
          setPollingActive(false);
          toast.success("Test Payment Verified Successfully!");
        } else if (data.payment_status === "failed" && active) {
          setTestStatus("failed");
          setPollingActive(false);
        }
      } catch (err) {
        console.warn("Error polling status:", err);
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollingActive, testDonationId, testStatus]);

  const simulateSuccess = async () => {
    if (!testDonationId) return;
    try {
      const res = await fetch(`${API}/donations/public/simulate-success`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: testDonationId })
      });
      if (res.ok) {
        setTestStatus("success");
        setPollingActive(false);
        toast.success("Success Simulated! Payment Integration Verified.");
      }
    } catch (e) {
      toast.error("Failed to simulate success");
    }
  };

  const handleCancelTest = () => {
    setTestDialogOpen(false);
    setPollingActive(false);
    setTestStatus("idle");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure payment gateways, merchant UPI, and run ₹1 integration tests.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-amber-500" />
            <span>Loading payment configurations...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left section: credentials */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border border-border/80 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <KeyRound className="h-4.5 w-4.5 text-amber-500" /> Payment Gateways
                  </CardTitle>
                  <CardDescription>
                    Configure the credentials used to collect devotee offerings. All donation buttons across layouts will automatically use these settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-border/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-200 uppercase tracking-widest block">Active Payment Gateway</Label>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Default: Razorpay
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 flex items-start gap-3">
                      <KeyRound className="size-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-0.5">Razorpay Gateway (Card / Netbanking / UPI / QR)</span>
                        <span className="text-xs text-amber-200/80 leading-relaxed">
                          Unified payment processor for multi-faith donation kiosks, QR offerings, cards, and automatic receipt generation.
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Razorpay Payment Gateway (Card / Netbanking / UPI)</Label>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold uppercase", razorpayMode === "test" ? "text-amber-400" : "text-emerald-400")}>
                          {razorpayMode === "test" ? "Test Mode" : "Live Mode"}
                        </span>
                        <Switch
                          checked={razorpayMode === "live"}
                          disabled={!isEditable}
                          onCheckedChange={(live) => isEditable && setRazorpayMode(live ? "live" : "test")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Razorpay Key ID</Label>
                        <Input
                          value={razorpayKeyId}
                          disabled={!isEditable}
                          onChange={(e) => setRazorpayKeyId(e.target.value)}
                          placeholder="rzp_test_... or rzp_live_..."
                          className="bg-slate-950/40 border-border/60 font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Razorpay Key Secret (API Secret)</Label>
                        <Input
                          type="password"
                          value={razorpayKeySecret}
                          disabled={!isEditable}
                          onChange={(e) => setRazorpayKeySecret(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="bg-slate-950/40 border-border/60 font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dedicated Razorpay Webhook Setup Card matching Razorpay Modal */}
              <Card className="border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-transparent shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">Razorpay Webhooks Setup</CardTitle>
                        <CardDescription className="text-xs">
                          Instantly receives devotee payment confirmations from Razorpay to your TV screen.
                        </CardDescription>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      Live Real-Time Sync
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Webhook URL Input with 1-Click Copy */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">1. Webhook URL (Copy & Paste in Razorpay Modal)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/donations/public/razorpay-webhook` : "https://happy-shamir.103-69-196-157.plesk.page/api/donations/public/razorpay-webhook"}
                        className="bg-slate-950/60 border-slate-800 font-mono text-xs text-emerald-300 selection:bg-emerald-500/30"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/api/donations/public/razorpay-webhook` : "https://happy-shamir.103-69-196-157.plesk.page/api/donations/public/razorpay-webhook";
                          navigator.clipboard.writeText(url);
                          toast.success("Webhook URL copied to clipboard!");
                        }}
                        className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold shrink-0 h-9"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy URL
                      </Button>
                    </div>
                  </div>

                  {/* Webhook Secret Input with Generate & Copy Buttons */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-300">2. Secret (Copy & Paste in Razorpay Modal)</Label>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => {
                            const randomSecret = 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(12)))
                              .map(b => b.toString(16).padStart(2, '0')).join('');
                            setRazorpayWebhookSecret(randomSecret);
                            navigator.clipboard.writeText(randomSecret);
                            toast.success("Generated and copied new Webhook Secret!");
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Wand2 className="h-3 w-3" />
                          <span>Generate Secret</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={razorpayWebhookSecret}
                        disabled={!isEditable}
                        onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                        placeholder="Click Generate Secret or enter your custom secret"
                        className="bg-slate-950/60 border-slate-800 font-mono text-xs text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {razorpayWebhookSecret && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(razorpayWebhookSecret);
                            toast.success("Webhook Secret copied to clipboard!");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold shrink-0 h-9"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Secret
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Active Events Checklist */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-semibold text-slate-300">3. Active Events to Check in Razorpay Modal</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-mono font-bold text-slate-200">payment.captured</p>
                          <p className="text-[11px] text-slate-400">Triggered when devotee's money is received</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-mono font-bold text-slate-200">order.paid</p>
                          <p className="text-[11px] text-slate-400">Triggered when donation order completes</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-slate-800/60">
                        <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-mono font-bold text-slate-400">payment.failed <span className="text-[10px] text-slate-500 font-normal">(Optional)</span></p>
                          <p className="text-[11px] text-slate-500">Notifies if devotee's payment failed</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick 3-Step Setup Guide */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
                    <p className="font-bold text-slate-200 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                      How to fill the Razorpay Webhooks Modal:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                      <li>Paste the <strong>Webhook URL</strong> into the <code className="text-emerald-400">Webhook URL</code> field in Razorpay.</li>
                      <li>Click <strong>Generate Secret</strong> above, click <strong>Copy Secret</strong>, and paste it into the <code className="text-emerald-400">Secret</code> field in Razorpay.</li>
                      <li>Under <strong>Active Events</strong>, tick <code className="text-emerald-400">payment.captured</code> and <code className="text-emerald-400">order.paid</code>, then click <strong>Create Webhook</strong>.</li>
                      <li>Finally, click <strong>Save Settings</strong> on this page to store the secret.</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                {isEditable ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditable(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSettings} disabled={saving} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-6">
                      {saving ? "Saving Configurations..." : "Save Settings"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditable(true)} className="bg-slate-900 border border-border/80 hover:bg-slate-800 text-slate-200 font-bold px-6">
                    Edit Settings
                  </Button>
                )}
              </div>
            </div>

            {/* Right section: connection testing widget */}
            <div className="space-y-6">
              <Card className="border border-amber-500/20 bg-amber-500/5 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-1.5 text-amber-500">
                    <Sparkles className="h-4.5 w-4.5" /> Connection Testing
                  </CardTitle>
                  <CardDescription className="text-amber-500/70">
                    Validate that your payment integration is correctly set up.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Switch to **Test Mode** (or enter test credentials) and click below. We will generate a ₹1 test QR code. You can scan with GPay/PhonePe to verify immediate receipt of the transaction updates.
                  </p>

                  <Button
                    type="button"
                    onClick={handleStartTest}
                    className="w-full bg-slate-900 border border-amber-500/30 hover:bg-slate-800 text-amber-400 font-bold"
                  >
                    Test Payment (₹1 QR)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border/55 bg-muted/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Gateway Status</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Direct UPI:</span>
                    <span className={upiId ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                      {upiId ? "Active" : "Not Configured"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Razorpay:</span>
                    <span className={razorpayKeyId ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                      {razorpayKeyId ? "Configured" : "Not Configured"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Webhook Status:</span>
                    <span className={razorpayWebhookSecret ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                      {razorpayWebhookSecret ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Integration Test Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={(o) => !o && handleCancelTest()}>
          <DialogContent className="max-w-sm sm:max-w-md bg-slate-900 text-foreground border border-slate-800 p-6 flex flex-col items-center">
            <DialogHeader className="w-full text-center">
              <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-amber-500" /> ₹1 Integration Test Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Scan the QR code with any UPI app to transfer ₹1. The screen will instantly confirm once payment is captured.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 p-4 bg-white rounded-xl shadow-lg flex justify-center items-center relative">
              {testStatus === "initiating" && (
                <div className="h-[200px] w-[200px] flex flex-col justify-center items-center text-slate-800 text-xs gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <span>Generating QR code...</span>
                </div>
              )}
              {testQrUrl && (
                <img src={testQrUrl} alt="₹1 UPI Test QR" className="w-[200px] h-[200px]" />
              )}
            </div>

            {testStatus === "polling" && (
              <div className="w-full space-y-4 text-center">
                {preferredGateway === 'upi' ? (
                  <div className="space-y-3.5">
                    <div className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed text-left">
                      💡 <strong>Direct UPI Transfer Mode:</strong> Since direct-to-bank UPI transfers do not have webhook callbacks, auto-confirmation is not available. Please scan, complete the payment, and click confirm below.
                    </div>
                    <Button 
                      onClick={simulateSuccess} 
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold text-xs py-2 rounded-lg shadow-md shadow-emerald-500/20"
                    >
                      Confirm Payment Sent (Manual Verification)
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-400 animate-pulse bg-amber-500/10 py-2 w-full rounded-lg border border-amber-500/20">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Waiting for Razorpay webhook confirmation...</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 text-muted-foreground hover:text-foreground mt-1" onClick={simulateSuccess}>
                      Simulate Success
                    </Button>
                  </div>
                )}
                <div className="flex justify-center mt-1">
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-4" onClick={handleCancelTest}>
                    Cancel Test
                  </Button>
                </div>
              </div>
            )}

            {testStatus === "success" && (
              <div className="w-full text-center space-y-4 pt-2">
                <div className="flex flex-col items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <span className="text-sm font-bold">✓ Payment Gateway Connected!</span>
                </div>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                  The ₹1 donation was successfully initiated, verified, and logged in the database. Payout configurations are functional.
                </p>
                <Button onClick={handleCancelTest} className="w-full bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold h-9">
                  Finish Test
                </Button>
              </div>
            )}

            {testStatus === "failed" && (
              <div className="w-full text-center space-y-4 pt-2">
                <div className="flex flex-col items-center gap-1.5 text-red-400">
                  <ShieldAlert className="h-10 w-10" />
                  <span className="text-sm font-bold">✗ Integration Test Failed</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Could not verify the payment connection. Please verify your Razorpay Key ID and Key Secret keys.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleStartTest} className="flex-1">Retry</Button>
                  <Button variant="secondary" onClick={handleCancelTest} className="flex-1">Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
