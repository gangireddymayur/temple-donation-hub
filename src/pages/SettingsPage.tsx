import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALL_RELIGIONS, getReligionConfig } from "@/lib/religion-config";
import {
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Code2,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "developer">("general");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [upiId, setUpiId] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [religion, setReligion] = useState("hinduism");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        const companyId = user?.user_metadata?.company_id;

        if (companyId) {
          const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
          if (data && !error) {
            setUpiId(data.upi_id || "");
            setRazorpayKeyId(data.razorpay_key_id || "");
            setRazorpayKeySecret(data.razorpay_key_secret || "");
            setReligion(data.religion || "hinduism");
          }
        }
      } catch (e) {
        console.warn("Failed to fetch settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      const companyId = user?.user_metadata?.company_id;

      if (!companyId) {
        toast.error("Company not found");
        return;
      }

      const { error } = await supabase.from("companies").update({
        upi_id: upiId,
        razorpay_key_id: razorpayKeyId,
        razorpay_key_secret: razorpayKeySecret,
        religion: religion,
      }).eq("id", companyId);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Settings & Faith configuration saved successfully!");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">System-wide configuration, multi-faith setup & developer info</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-card/60 border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab("general")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "general"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Sliders className="size-3.5" /> General & Faith
            </button>
            <button
              onClick={() => setActiveTab("developer")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "developer"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Code2 className="size-3.5" /> Developer Info
            </button>
          </div>
        </div>

        {activeTab === "general" ? (
          <div className="max-w-2xl space-y-6">
            {/* Faith & Religion Selector Card */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.02]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getReligionConfig(religion).symbol}</span>
                  <div>
                    <CardTitle className="text-base">Active Faith & Religion System</CardTitle>
                    <CardDescription className="text-xs">
                      Controls dynamic signage templates, terminology & default donation presets
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_RELIGIONS.map((rel) => {
                    const isSelected = religion.toLowerCase() === rel.id;
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => setReligion(rel.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all relative ${
                          isSelected
                            ? `${rel.borderClass} ${rel.badgeClass} ring-1 ring-amber-500/50 shadow-md font-bold`
                            : "border-slate-800 bg-slate-900/40 text-muted-foreground hover:border-slate-700 hover:text-foreground"
                        }`}
                      >
                        <span className="text-xl mb-1">{rel.symbol}</span>
                        <span className="text-xs truncate w-full">{rel.shortName}</span>
                        {isSelected && (
                          <CheckCircle2 className="size-3.5 text-amber-400 absolute top-1.5 right-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Preview */}
                {(() => {
                  const currentRel = getReligionConfig(religion);
                  return (
                    <div className="p-3 rounded-xl bg-background/80 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400">{currentRel.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                          {currentRel.terminology.donationName}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{currentRel.tagline}</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input defaultValue="Temple Donation Hub" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@templedonation.org" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Device Offline Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified when a device goes offline</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Content Expiry Warnings</p>
                    <p className="text-xs text-muted-foreground">Alert before scheduled content expires</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Usage Reports</p>
                    <p className="text-xs text-muted-foreground">Weekly analytics digest via email</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation Configurations (Temple Daan)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Merchant UPI ID (e.g. name@bank, for free direct UPI QR codes)</Label>
                  <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="temple@upi" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Razorpay API Gateway (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Razorpay Key ID</Label>
                      <Input value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." />
                    </div>
                    <div className="space-y-1">
                      <Label>Razorpay Key Secret</Label>
                      <Input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="••••••••••••••••" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving || loading}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* DEVELOPER INFO SHOWCASE PROFILE */
          <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="p-6 sm:p-8 border border-border relative overflow-hidden bg-card/60 backdrop-blur-xl">
              {/* Background gradient blur elements */}
              <div className="absolute -top-24 -right-24 size-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

              {/* Developer Profile Banner Image */}
              <div className="w-full rounded-2xl border border-border/40 overflow-hidden bg-muted/40 mb-6 shadow-xl">
                <img
                  src="/advaitha.png"
                  alt="Advaitha Automations Showcase"
                  className="w-full h-auto object-contain"
                />
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border/50">
                <div className="space-y-2">
                  <div className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary tracking-wider uppercase">
                    System Developer Profile
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                    ADVAITHA Automations
                  </h2>
                  <p className="text-sm font-semibold text-foreground/80">
                    ADVAITHA Designers N Networks
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span>Road No.12, Banjara Hills, Mithali Nagar, Hyderabad - 500034</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Offices: Hyderabad | Vijayawada | Visakhapatnam
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 shrink-0">
                  <a
                    href="mailto:contact@advaitha.co.in"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Mail className="size-3.5 text-primary" />
                    <span>contact@advaitha.co.in</span>
                  </a>
                  <a
                    href="tel:9490468368"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Phone className="size-3.5 text-emerald-400" />
                    <span>+91 9490468368</span>
                  </a>
                </div>
              </div>

              {/* WhatsApp Integration CTA */}
              <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <MessageSquare className="size-4 shrink-0" /> Instant Technical Support
                  </h4>
                  <p className="text-xs text-emerald-300/80 leading-normal max-w-md">
                    Have questions, custom integrations, temple kiosk hardware or need engineering support? Chat directly with us on WhatsApp.
                  </p>
                </div>
                <a
                  href="https://wa.me/9490468368"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-extrabold hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Chat on WhatsApp
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {/* Services Showcase Grid */}
              <div className="mt-8 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Our Solutions & Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5 p-4 rounded-2xl bg-muted/20 border border-border/50">
                    <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Enterprise & Operations</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>High-Performance Servers</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>IT Infrastructure & Managed Services</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>Custom Software & Apps Development</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>Evolis ID Card Printers & Consumables</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2.5 p-4 rounded-2xl bg-muted/20 border border-border/50">
                    <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Security & Digital Signage</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-indigo-400" />
                        <span>SDWAN / Enterprise Firewalls</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-indigo-400" />
                        <span>CCTV Surveillance Systems</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-indigo-400" />
                        <span>Queue Management & Digital Kiosks</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-indigo-400" />
                        <span>Digital Signage & Biometric Attendance</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Strategic Partnerships Section */}
              <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                  Strategic Technology Partnerships
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    Google Partner
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    Cisco Partner
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    Honeywell Partner
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    Microsoft Silver Partner
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    Evolis Partner
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-[10px] font-semibold text-muted-foreground">
                    StackUp
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
