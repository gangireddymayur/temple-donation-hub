import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, LayoutGrid, Trash2, Pencil, Monitor, Sparkles, Wand2, Settings2, UserCheck, MessageSquare, AlertCircle, ExternalLink, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getReligionConfig } from "@/lib/religion-config";
import { logAudit } from "@/lib/audit-logger";
import { CustomerInfoConfig, FormFieldConfig } from "@/lib/screen-editor-types";

interface Layout {
  id: string;
  name: string;
  description: string | null;
  resolution_width: number;
  resolution_height: number;
  background_color: string;
  created_at: string;
  updated_at: string;
  company_id: string;
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

function getUniqueLayoutName(baseName: string, existingLayouts: any[]): string {
  const existingNames = new Set(existingLayouts.map((l: any) => (l.name || "").trim().toLowerCase()));
  if (!existingNames.has(baseName.trim().toLowerCase())) {
    return baseName;
  }
  let counter = 2;
  while (
    existingNames.has(`${baseName} ${counter}`.trim().toLowerCase()) ||
    existingNames.has(`${baseName} (${counter})`.trim().toLowerCase())
  ) {
    counter++;
  }
  return `${baseName} ${counter}`;
}

export default function AdminLayoutsPage() {
  const { user, role, company, religion } = useAuth();
  const relMeta = getReligionConfig(religion);
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [resWidth, setResWidth] = useState(1920);
  const [resHeight, setResHeight] = useState(1080);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editLayout, setEditLayout] = useState<Layout | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLayout, setDeleteLayout] = useState<Layout | null>(null);

  // Devotee Form Config Modal State
  const [formConfigOpen, setFormConfigOpen] = useState(false);
  const [formConfig, setFormConfig] = useState<CustomerInfoConfig>(DEFAULT_FORM_CONFIG);
  const [savingForm, setSavingForm] = useState(false);

  // 2 Screen Limit Upgrade Modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const maxScreens = company?.max_screens ?? (role === "super_admin" ? 999 : 2);
  const isScreenLimitReached = layouts.length >= maxScreens && role !== "super_admin";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("company_id").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.company_id) {
          setCompanyId(data.company_id);
          fetchLayouts(data.company_id);
          fetchCompanyConfig(data.company_id);
        } else setLoading(false);
      });
  }, [user]);

  const fetchCompanyConfig = async (cId: string) => {
    const { data } = await supabase
      .from("companies")
      .select("customer_info_config")
      .eq("id", cId)
      .single();
    if (data?.customer_info_config) {
      setFormConfig(data.customer_info_config as unknown as CustomerInfoConfig);
    }
  };

  const fetchLayouts = async (cId: string) => {
    const { data, error } = await supabase
      .from("layouts")
      .select("*")
      .eq("company_id", cId)
      .order("updated_at", { ascending: false });
    if (error) { toast.error("Failed to load layouts"); setLoading(false); return; }
    setLayouts(data ?? []);
    setLoading(false);
  };

  const handleSaveFormConfig = async () => {
    if (!companyId) return;
    setSavingForm(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ customer_info_config: formConfig as any })
        .eq("id", companyId);

      if (error) throw error;
      toast.success("Default devotee form settings saved successfully!");
      setFormConfigOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save devotee form settings");
    } finally {
      setSavingForm(false);
    }
  };

  const updateField = (field: keyof CustomerInfoConfig["fields"], key: keyof FormFieldConfig, val: boolean) => {
    setFormConfig((prev) => {
      const updatedFields = {
        ...prev.fields,
        [field]: {
          ...prev.fields[field],
          [key]: val,
          ...(key === "enabled" && !val ? { required: false } : {}),
        },
      };
      return { ...prev, fields: updatedFields };
    });
  };

  const handleCreateFromReligionTemplate = async (templateStyle: 'modern' | 'traditional' | 'glass' | 'divine' | 'minimal') => {
    if (!companyId) return;

    if (isScreenLimitReached) {
      setUpgradeModalOpen(true);
      return;
    }

    setSubmitting(true);

    const theme = relMeta.templateThemes[templateStyle] || relMeta.templateThemes.modern;
    const rawTemplateName = `${relMeta.shortName} ${templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)} Screen`;
    const templateName = getUniqueLayoutName(rawTemplateName, layouts);

    const layoutData = {
      id: "root",
      split: "none",
      splitRatio: 50,
      children: null,
      content: {
        id: `widget-${Date.now()}`,
        type: "donation",
        label: templateName,
        templateStyle: templateStyle,
        donationTitle: theme.header,
        donationPurpose: theme.subheader,
        backgroundColor: "#111029",
        donationTitleColor: "#fbbf24",
        donationSubtitleColor: "#e2e8f0",
        donationSpacing: 4,
        donationContainerRadius: 16,
        donationButtons: relMeta.presetCauses.slice(0, 4).map((c, idx) => ({
          id: `btn-${Date.now()}-${idx + 1}`,
          amount: c.amount,
          label: c.name,
          description: c.description,
          badge: c.isPopular ? "Featured" : undefined,
          hoverEffect: "scale",
          clickAnimation: "pop",
          visible: true,
        }))
      }
    };

    const { data, error } = await supabase.from("layouts").insert({
      company_id: companyId,
      name: templateName,
      description: `Auto-generated ${templateStyle} layout configured for ${relMeta.name}`,
      resolution_width: 1920,
      resolution_height: 1080,
      background_color: "#0a0a0f",
      layout_data: JSON.stringify(layoutData),
    }).select().single();

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${templateName} created!`);
      await logAudit(
        "LAYOUT_CREATE",
        "layouts",
        `Created layout from template "${templateName}" for faith: ${relMeta.name}`,
        { companyId }
      );
      navigate(`/admin/layouts/${data.id}`);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (isScreenLimitReached) {
      setAddOpen(false);
      setUpgradeModalOpen(true);
      return;
    }

    setSubmitting(true);
    const uniqueName = getUniqueLayoutName(name.trim() || "Untitled Layout", layouts);
    const { data, error } = await supabase.from("layouts").insert({
      company_id: companyId,
      name: uniqueName,
      description: description || null,
      resolution_width: resWidth,
      resolution_height: resHeight,
    }).select().single();
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Layout "${uniqueName}" created!`);
      setAddOpen(false);
      setName(""); setDescription(""); setResWidth(1920); setResHeight(1080);
      navigate(`/admin/layouts/${data.id}`);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLayout || !companyId) return;
    setSubmitting(true);
    const { error } = await supabase.from("layouts").update({
      name: editName,
      description: editDescription || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editLayout.id);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success("Layout updated!"); setEditOpen(false); fetchLayouts(companyId); }
  };

  const handleDelete = async () => {
    if (!deleteLayout || !companyId) return;
    setSubmitting(true);
    const { error } = await supabase.from("layouts").delete().eq("id", deleteLayout.id);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Layout deleted!");
      setDeleteOpen(false);
      setDeleteLayout(null);
      const nextTotalPages = Math.ceil((layouts.length - 1) / itemsPerPage);
      if (currentPage > nextTotalPages) {
        setCurrentPage(Math.max(1, nextTotalPages));
      }
      fetchLayouts(companyId);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const totalPages = Math.ceil(layouts.length / itemsPerPage);
  const paginatedLayouts = layouts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Layouts</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage screen layouts</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setFormConfigOpen(true)}
              className="border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
            >
              <UserCheck className="h-4 w-4 mr-2" /> Devotee Form Config
            </Button>
            <Dialog open={addOpen} onOpenChange={(open) => {
              if (open && isScreenLimitReached) {
                setUpgradeModalOpen(true);
                return;
              }
              setAddOpen(open);
            }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Layout</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Layout</DialogTitle></DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Lobby Display" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Width (px)</Label>
                      <Input type="number" value={resWidth} onChange={(e) => setResWidth(parseInt(e.target.value) || 1920)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input type="number" value={resHeight} onChange={(e) => setResHeight(parseInt(e.target.value) || 1080)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Creating..." : "Create & Edit Layout"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 1-Click Faith-Specific Screen Layout Templates */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/[0.04] via-orange-500/[0.02] to-transparent">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{relMeta.symbol}</span>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    1-Click {relMeta.shortName} Screen Templates
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Instantly spin up pre-configured donation & signage screens tailored for {relMeta.name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                  {layouts.length} / {maxScreens} Screens
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  {relMeta.shortName}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { style: 'modern' as const, label: 'Modern Kiosk', desc: 'Vibrant gradients & clean buttons' },
                { style: 'traditional' as const, label: 'Traditional Mandir', desc: 'Serene sacred temple theme' },
                { style: 'glass' as const, label: 'Glassmorphism', desc: 'Sleek frosted glass aesthetic' },
                { style: 'divine' as const, label: 'Divine Sacred', desc: 'Rich gold & holy sanctuary' },
                { style: 'minimal' as const, label: 'Minimalist Dark', desc: 'High-contrast focused giving' },
              ].map((tmpl) => (
                <button
                  key={tmpl.style}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreateFromReligionTemplate(tmpl.style)}
                  className="flex flex-col text-left p-3 rounded-xl border border-white/10 bg-background/50 hover:bg-white/5 hover:border-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-foreground group-hover:text-amber-400 transition-colors">
                      {tmpl.label}
                    </span>
                    <Wand2 className="size-3 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {tmpl.desc}
                  </span>
                  <div className="mt-2.5 text-[10px] text-amber-500 font-bold flex items-center gap-1 group-hover:underline">
                    <span>+ Generate Layout</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Layouts List */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" /> Active Screen Layouts
            </CardTitle>
            <CardDescription>
              All configured screens for your temple donation kiosks and signage devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading layouts...</div>
            ) : layouts.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <LayoutGrid className="size-10 mx-auto text-muted-foreground/40 stroke-1" />
                <p className="text-sm font-semibold">No screen layouts yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click one of the 1-Click {relMeta.shortName} screen templates above to instantly generate your first donation kiosk screen.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Layout</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLayouts.map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/10">
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{l.name}</div>
                          {l.description && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-xs">{l.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Monitor className="h-3 w-3" /> {l.resolution_width}×{l.resolution_height}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatDate(l.updated_at || l.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                              onClick={() => navigate(`/admin/layouts/${l.id}`)}
                            >
                              Edit Layout
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditLayout(l); setEditName(l.name); setEditDescription(l.description || ""); setEditOpen(true);
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                              setDeleteLayout(l); setDeleteOpen(true);
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 text-xs border-white/10"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 text-xs border-white/10"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Devotee Form Configuration Dialog */}
      <Dialog open={formConfigOpen} onOpenChange={setFormConfigOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-amber-500" /> Default Devotee Form Configuration
            </DialogTitle>
            <DialogDescription>
              Configure which fields are prompted on donation kiosks when devotees select an offering card before paying.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-border/60 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Enable Devotee Information Popup</Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, tapping any offering card launches a popup form before generating the QR code.
                </p>
              </div>
              <Switch
                checked={formConfig.popupEnabled}
                onCheckedChange={(val) => setFormConfig((prev) => ({ ...prev, popupEnabled: val }))}
              />
            </div>

            {formConfig.popupEnabled && (
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 text-xs font-bold border-b">
                  <span>Devotee Field</span>
                  <span className="text-center">Collect Field</span>
                  <span className="text-center">Mark Required</span>
                </div>

                <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
                  {(Object.keys(formConfig.fields) as Array<keyof CustomerInfoConfig["fields"]>).map((field) => {
                    const config = formConfig.fields[field];
                    const label = field.charAt(0).toUpperCase() + field.slice(1);
                    return (
                      <div key={field} className="grid grid-cols-3 gap-2 p-2.5 items-center text-xs">
                        <span className="font-semibold text-foreground capitalize">{label}</span>
                        <div className="flex justify-center">
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={(val) => updateField(field, "enabled", val)}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={config.required}
                            disabled={!config.enabled}
                            onCheckedChange={(val) => updateField(field, "required", val)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setFormConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFormConfig} disabled={savingForm} className="bg-primary text-primary-foreground font-bold">
              {savingForm ? "Saving..." : "Save Devotee Form Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2-Screen Limit Upgrade Dialog */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="max-w-md text-center p-6 space-y-4">
          <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400 mx-auto">
            <ShieldAlert className="size-7" />
          </div>
          <DialogHeader className="text-center space-y-1.5">
            <DialogTitle className="text-lg font-bold text-center">Screen Limit Reached (Max {maxScreens} Screens)</DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground leading-relaxed">
              Your free trial includes up to <strong>{maxScreens} active screen layouts</strong>. To add more screen layouts for multi-kiosk temples and digital displays, please contact our support team to upgrade your subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/40 rounded-xl border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Need more screens or multi-temple support?</p>
            <p>Our team will activate higher capacity and custom device packages immediately.</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setUpgradeModalOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <a
              href="https://wa.me/919490468368?text=Hello%20Team%2C%20I%20want%20to%20upgrade%20my%20Temple%20Donation%20Hub%20screen%20limit%20beyond%202%20screens."
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="size-4" />
              Contact on WhatsApp (+91 9490468368)
              <ExternalLink className="size-3" />
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Layout</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Layout</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteLayout?.name}</strong>?</p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
