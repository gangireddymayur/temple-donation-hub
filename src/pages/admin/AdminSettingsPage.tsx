import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Upload, X, LogOut, Edit2, Save, Loader2, RefreshCw, SlidersHorizontal,
  CheckCircle2, Sparkles, HeartHandshake, Mail, Phone, MapPin, MessageSquare, ExternalLink,
  Code2, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALL_RELIGIONS, getReligionConfig, ReligionType } from "@/lib/religion-config";
import { logAudit } from "@/lib/audit-logger";

export default function AdminSettingsPage() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "developer">("general");
  const [loading, setLoading] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Company settings fields
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showBrandHeader, setShowBrandHeader] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandHeaderPlacement, setBrandHeaderPlacement] = useState<string>("top");
  const [showPlacementSettings, setShowPlacementSettings] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Faith / Religion selection
  const [religion, setReligion] = useState<string>("hinduism");
  const [savingReligion, setSavingReligion] = useState(false);

  // Original load state to track modifications
  const [originalData, setOriginalData] = useState<{
    fullName: string;
    companyName: string;
    logoUrl: string | null;
    showBrandHeader: number;
    brandHeaderPlacement: string;
    religion: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: profile } = await supabase.from("profiles").select("full_name, email, company_id").eq("id", user.id).single();
        if (profile) {
          setFullName(profile.full_name ?? "");
          setEmail(profile.email ?? "");
          if (profile.company_id) {
            setCompanyId(profile.company_id);
            const { data: company } = await supabase.from("companies").select("name, logo_url, show_brand_header, brand_header_placement, religion").eq("id", profile.company_id).single();
            if (company) {
              setCompanyName(company.name ?? "");
              setLogoUrl((company as any).logo_url ?? null);
              setShowBrandHeader((company as any).show_brand_header ?? 0);
              setBrandHeaderPlacement((company as any).brand_header_placement ?? "top");
              const rel = (company as any).religion || "hinduism";
              setReligion(rel);

              setOriginalData({
                fullName: profile.full_name ?? "",
                companyName: company.name ?? "",
                logoUrl: (company as any).logo_url ?? null,
                showBrandHeader: (company as any).show_brand_header ?? 0,
                brandHeaderPlacement: (company as any).brand_header_placement ?? "top",
                religion: rel,
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    return (
      fullName !== originalData.fullName ||
      companyName !== originalData.companyName ||
      logoUrl !== originalData.logoUrl ||
      showBrandHeader !== originalData.showBrandHeader ||
      brandHeaderPlacement !== originalData.brandHeaderPlacement
    );
  }, [fullName, companyName, logoUrl, showBrandHeader, brandHeaderPlacement, originalData]);

  const handleUpdateReligion = async (newRel: string) => {
    if (!companyId) return;
    setSavingReligion(true);
    try {
      const { error } = await supabase.from("companies").update({ religion: newRel }).eq("id", companyId);
      if (error) throw error;
      setReligion(newRel);
      if (originalData) {
        setOriginalData({ ...originalData, religion: newRel });
      }
      const relMeta = getReligionConfig(newRel);
      toast.success(`Active faith updated to ${relMeta.name}! Templates and terminology adapted.`);
      await logAudit(
        "RELIGION_UPDATE",
        "religion",
        `Changed active faith system to ${relMeta.name}`,
        { companyId }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update religion");
    } finally {
      setSavingReligion(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user || !companyId) return;
    setSavingSettings(true);

    try {
      // 1. Save profile full_name
      if (fullName !== originalData?.fullName) {
        const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
        if (profileError) throw profileError;
      }

      // 2. Save company configurations (timezone defaults to Asia/Kolkata for India)
      if (
        companyName !== originalData?.companyName ||
        logoUrl !== originalData?.logoUrl ||
        showBrandHeader !== originalData?.showBrandHeader ||
        brandHeaderPlacement !== originalData?.brandHeaderPlacement
      ) {
        const { error: companyError } = await supabase.from("companies").update({
          name: companyName,
          timezone: "Asia/Kolkata",
          logo_url: logoUrl,
          show_brand_header: showBrandHeader,
          brand_header_placement: brandHeaderPlacement,
        } as any).eq("id", companyId);
        if (companyError) throw companyError;
      }

      toast.success("Settings saved successfully");
      setIsEditing(false);
      setOriginalData({
        fullName,
        companyName,
        logoUrl,
        showBrandHeader,
        brandHeaderPlacement,
        religion,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (originalData) {
      setFullName(originalData.fullName);
      setCompanyName(originalData.companyName);
      setLogoUrl(originalData.logoUrl);
      setShowBrandHeader(originalData.showBrandHeader);
      setBrandHeaderPlacement(originalData.brandHeaderPlacement);
      setShowPlacementSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("content").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("content").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo uploaded! Remember to click Save Changes.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut();
  };

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem("sh_token");
      const res = await fetch("/api/backup", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to download backup");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `temple_donation_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    } catch (err: any) {
      toast.error("Failed to generate backup: " + err.message);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = window.confirm(
      "WARNING: Restoring backup will import all layouts, content, devices, and schedules from the file. Do you want to proceed?"
    );
    if (!ok) return;

    setRestoring(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const token = localStorage.getItem("sh_token");
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to restore backup");
      }
      toast.success("Data restored successfully! Refreshing page...");
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to restore backup: " + err.message);
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <PageHeader title="Settings" />
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="size-8 text-primary animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Profile, faith preferences, branding and developer information.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile and Branding Settings Card */}
        <GlassCard className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h3 className="font-semibold text-lg">Profile & Branding</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage organization info and logo asset settings.</p>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 border-white/10 text-xs">
                <Edit2 className="size-3.5 mr-1.5" /> Edit Info
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-8 text-xs text-muted-foreground">
                  <X className="size-3.5 mr-1.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || savingSettings}
                  className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                >
                  <Save className="size-3.5 mr-1.5" /> Save Changes
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? "bg-white/[0.02] border-white/5 opacity-80" : ""}
            />
            <Field
              label="Email Address"
              value={email}
              disabled
              className="bg-white/5 border-white/5 opacity-70 cursor-not-allowed"
            />
            <Field
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!isEditing}
              placeholder="Your company/org name"
              className={cn("md:col-span-2", !isEditing ? "bg-white/[0.02] border-white/5 opacity-80" : "")}
            />
          </div>

          {/* Logo upload and preview */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <Label className="text-xs font-semibold text-muted-foreground">Company Logo</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="size-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company logo preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="size-8 text-muted-foreground" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-[11px] text-muted-foreground">
                  Recommended size: 250x250 pixels. PNG or JPG format.
                </p>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={!isEditing || uploadingLogo}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      id="logo-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-white/10"
                      disabled={!isEditing || uploadingLogo}
                    >
                      Choose Image
                    </Button>
                  </div>
                  {logoUrl && isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Brand Header Toggle */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-foreground">Show Brand Header on Devices</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Display logo, organization name, and local clock on signage screens.</p>
              </div>
              <div className="flex items-center gap-2">
                {showBrandHeader === 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!isEditing}
                    onClick={() => setShowPlacementSettings(!showPlacementSettings)}
                    className={cn(
                      "h-8 w-8 rounded-full border border-white/5 transition-colors",
                      showPlacementSettings ? "bg-white/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                )}
                <Switch
                  disabled={!isEditing}
                  checked={showBrandHeader === 1}
                  onCheckedChange={(checked) => {
                    setShowBrandHeader(checked ? 1 : 0);
                    if (!checked) setShowPlacementSettings(false);
                  }}
                />
              </div>
            </div>

            {showBrandHeader === 1 && showPlacementSettings && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Header Placement</Label>
                  <select
                    disabled={!isEditing}
                    value={brandHeaderPlacement}
                    onChange={(e) => setBrandHeaderPlacement(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl h-9 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  >
                    <option value="top">Top (Default)</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left Sidebar</option>
                    <option value="right">Right Sidebar</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Adjusts the position of the branding bar on all active playback displays.
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Right side cards */}
        <div className="space-y-6">
          {/* Faith & Religion System Configuration Card */}
          <GlassCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.03] to-orange-500/[0.01]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getReligionConfig(religion).symbol}</span>
                <div>
                  <h3 className="font-bold text-base text-foreground">Faith & Religion System</h3>
                  <p className="text-[11px] text-muted-foreground">Sets dynamic screen templates & donation causes</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {ALL_RELIGIONS.map((rel) => {
                  const isSelected = religion.toLowerCase() === rel.id;
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      disabled={savingReligion}
                      onClick={() => handleUpdateReligion(rel.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all relative ${
                        isSelected
                          ? `${rel.borderClass} ${rel.badgeClass} ring-1 ring-amber-500/50 shadow-md font-bold`
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      <span className="text-lg mb-0.5">{rel.symbol}</span>
                      <span className="text-xs truncate w-full">{rel.shortName}</span>
                      {isSelected && (
                        <CheckCircle2 className="size-3.5 text-amber-400 absolute top-1.5 right-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Religion Preview Banner */}
              {(() => {
                const currentRel = getReligionConfig(religion);
                return (
                  <div className="p-3 rounded-xl bg-background/60 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{currentRel.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                        {currentRel.terminology.donationName}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{currentRel.tagline}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentRel.presetCauses.slice(0, 3).map((cause) => (
                        <span key={cause.id} className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5 text-slate-300">
                          ₹{cause.amount} • {cause.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </GlassCard>

          {/* Security Password Card */}
          <GlassCard>
            <h3 className="font-semibold text-lg mb-1">Security</h3>
            <p className="text-xs text-muted-foreground mb-4">Update your account password.</p>
            <div className="space-y-4">
              <Field
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <Field
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
              <Button
                className="w-full mt-2 h-9 text-xs"
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
              >
                {changingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </GlassCard>

          {/* Backup & Restore Card */}
          <GlassCard>
            <h3 className="font-semibold text-lg mb-1">Backup & Restore</h3>
            <p className="text-xs text-muted-foreground mb-4">Export or import your complete account data (layouts, content, devices, and schedules).</p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full h-9 text-xs border-border" onClick={handleDownloadBackup}>
                Download Backup
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  disabled={restoring}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  id="backup-file-input"
                />
                <Button variant="outline" className="w-full h-9 text-xs border-border" disabled={restoring}>
                  {restoring ? "Restoring Data…" : "Upload Backup File"}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Session Management / Log Out Card */}
          <GlassCard className="border-red-500/20 bg-red-500/[0.01]">
            <h3 className="font-semibold text-red-400 text-lg mb-1">Session</h3>
            <p className="text-xs text-muted-foreground mb-4">Log out of your current session on this device.</p>
            <Button variant="destructive" className="w-full h-9 text-xs" onClick={() => setLogoutOpen(true)}>
              <LogOut className="size-4 mr-2" /> Log Out
            </Button>
          </GlassCard>
        </div>
      </div>
      ) : (
        /* DEVELOPER INFO SHOWCASE PROFILE */
        <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <GlassCard className="p-6 sm:p-8 border border-border relative overflow-hidden bg-card/60 backdrop-blur-xl">
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10">
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
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition-colors"
                >
                  <Mail className="size-3.5 text-primary" />
                  <span>contact@advaitha.co.in</span>
                </a>
                <a
                  href="tel:9490468368"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition-colors"
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
                  Have questions, custom integrations, temple kiosk hardware or need engineering support? Chat directly with our engineering team on WhatsApp.
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
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
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
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
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
            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                Strategic Technology Partnerships
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  Google Partner
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  Cisco Partner
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  Honeywell Partner
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  Microsoft Silver Partner
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  Evolis Partner
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                  StackUp
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800 text-foreground">
          <DialogHeader>
            <DialogTitle>Confirm Log Out</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs pt-1">
              Are you sure you want to log out? You will need to enter your credentials to access the dashboard again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/5 mt-4">
            <Button variant="outline" size="sm" onClick={() => setLogoutOpen(false)} className="h-8 text-xs border-white/10">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="h-8 text-xs font-semibold">
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card/40 backdrop-blur-md border rounded-2xl shadow-sm p-4", className)} {...props}>
      {children}
    </div>
  );
}

function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1 mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function Field({ label, className, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input {...props} className={cn("bg-white/5 border-white/10 text-xs h-9", className)} />
    </div>
  );
}
