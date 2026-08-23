import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { ZoneRenderer } from "@/components/screen-editor/ZoneRenderer";
import { WidgetPalette } from "@/components/screen-editor/WidgetPalette";
import { ZoneProperties, type MediaContentItem } from "@/components/screen-editor/ZoneProperties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  ScreenZone,
  ContentWidget,
  createZone,
  CustomerInfoConfig
} from "@/lib/screen-editor-types";
import {
  ArrowLeft,
  Save,
  Maximize,
  RotateCcw,
  Undo2,
  Redo2,
  LayoutGrid,
  ClipboardList,
  Globe,
  Languages,
  Sparkles,
  Loader2,
  Type
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES, translateZoneContent } from "@/lib/language-translator";
import { SUPPORTED_FONTS } from "@/lib/fonts";

function findZone(zone: ScreenZone, id: string): ScreenZone | null {
  if (zone.id === id) return zone;
  if (zone.children) {
    return findZone(zone.children[0], id) || findZone(zone.children[1], id);
  }
  return null;
}

function updateZoneContent(zone: ScreenZone, zoneId: string, widget: ContentWidget): ScreenZone {
  if (zone.id === zoneId) return { ...zone, content: widget };
  if (zone.children) {
    return {
      ...zone,
      children: [
        updateZoneContent(zone.children[0], zoneId, widget),
        updateZoneContent(zone.children[1], zoneId, widget),
      ],
    };
  }
  return zone;
}

function normalizeZoneForSave(zone: ScreenZone): ScreenZone {
  const content =
    zone.content?.type === "video" && !zone.content.objectFit
      ? { ...zone.content, objectFit: "cover" as const }
      : zone.content;

  return {
    ...zone,
    content,
    children: zone.children
      ? [normalizeZoneForSave(zone.children[0]), normalizeZoneForSave(zone.children[1])]
      : null,
  };
}

type EditorSnapshot = { rootZone: ScreenZone; backgroundColor: string };

export default function AdminLayoutEditorPage() {
  const { layoutId } = useParams<{ layoutId: string }>();
  const navigate = useNavigate();

  const [layoutName, setLayoutName] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#1a1a2e");
  const [resWidth, setResWidth] = useState(1920);
  const [resHeight, setResHeight] = useState(1080);
  const [rootZone, setRootZone] = useState<ScreenZone>(() => createZone("root"));
  const [companyInfoConfig, setCompanyInfoConfig] = useState<CustomerInfoConfig | null>(null);
  const snapshotRef = useRef<EditorSnapshot>({ rootZone: createZone("root"), backgroundColor: "#1a1a2e" });
  const [history, setHistory] = useState<{ past: EditorSnapshot[]; future: EditorSnapshot[] }>({ past: [], future: [] });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentItems, setContentItems] = useState<MediaContentItem[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);

  const selectedZone = selectedZoneId ? findZone(rootZone, selectedZoneId) : null;
  const selectedWidget = selectedZone?.content || null;
  const canvasRatio = `${resWidth}/${resHeight}`;

  const handleTranslateLanguage = async (targetLang: string) => {
    if (targetLang === currentLanguage) return;
    try {
      setTranslating(true);
      const targetMeta = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
      toast.loading(`Translating layout to ${targetMeta?.name || targetLang} via Google Translate...`);
      const translatedRoot = await translateZoneContent(rootZone, targetLang);
      commitSnapshot((prev) => ({ ...prev, rootZone: translatedRoot }));
      setCurrentLanguage(targetLang);
      toast.dismiss();
      toast.success(`Layout translated to ${targetMeta?.name || targetLang}!`);
    } catch (err: any) {
      toast.dismiss();
      toast.error("Translation failed: " + err.message);
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    if (!layoutId) return;
    const fetchLayout = async () => {
      const { data, error } = await supabase
        .from("layouts")
        .select("*")
        .eq("id", layoutId)
        .single();
      if (error || !data) {
        toast.error("Layout not found");
        navigate("/admin/layouts");
        return;
      }
      setLayoutName(data.name);
      setBackgroundColor(data.background_color);
      setResWidth(data.resolution_width);
      setResHeight(data.resolution_height);

      const parsedLayout = data.layout_data 
        ? (typeof data.layout_data === "string" ? JSON.parse(data.layout_data) : data.layout_data) 
        : null;

      const nextSnapshot: EditorSnapshot = {
        rootZone: createZone("root"),
        backgroundColor: data.background_color,
      };

      if (parsedLayout && parsedLayout.id) {
        nextSnapshot.rootZone = parsedLayout as unknown as ScreenZone;
      } else {
        nextSnapshot.rootZone = createZone("root");
      }

      snapshotRef.current = nextSnapshot;
      setRootZone(nextSnapshot.rootZone);
      setHistory({ past: [], future: [] });

      // Fetch company default customer info config
      const { data: companyData } = await supabase
        .from("companies")
        .select("customer_info_config")
        .eq("id", data.company_id)
        .single();
      if (companyData && companyData.customer_info_config) {
        setCompanyInfoConfig(companyData.customer_info_config as unknown as CustomerInfoConfig);
      }

      // Fetch content items for this company
      const { data: contentData } = await supabase
        .from("content")
        .select("id, name, type, file_url")
        .eq("company_id", data.company_id)
        .order("created_at", { ascending: false });
      setContentItems(contentData ?? []);

      setLoading(false);
    };
    fetchLayout();
  }, [layoutId, navigate]);

  const commitSnapshot = useCallback((updater: (current: EditorSnapshot) => EditorSnapshot) => {
    const current = snapshotRef.current;
    const next = updater(current);
    snapshotRef.current = next;
    setHistory((prev) => ({ past: [...prev.past, current].slice(-50), future: [] }));
    setRootZone(next.rootZone);
    setBackgroundColor(next.backgroundColor);
  }, []);

  const handleZoneUpdate = useCallback((updatedRoot: ScreenZone) => {
    commitSnapshot((prev) => ({ ...prev, rootZone: updatedRoot }));
  }, [commitSnapshot]);

  const handleWidgetUpdate = useCallback(
    (widget: ContentWidget) => {
      if (!selectedZoneId) return;
      commitSnapshot((prev) => ({ ...prev, rootZone: updateZoneContent(prev.rootZone, selectedZoneId, widget) }));
    },
    [commitSnapshot, selectedZoneId]
  );

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const current = snapshotRef.current;
      snapshotRef.current = previous;
      setRootZone(previous.rootZone);
      setBackgroundColor(previous.backgroundColor);
      setSelectedZoneId(null);
      return { past: prev.past.slice(0, -1), future: [current, ...prev.future].slice(0, 50) };
    });
  };

  const handleRedo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const current = snapshotRef.current;
      snapshotRef.current = next;
      setRootZone(next.rootZone);
      setBackgroundColor(next.backgroundColor);
      setSelectedZoneId(null);
      return { past: [...prev.past, current].slice(-50), future: prev.future.slice(1) };
    });
  };

  const handleReset = () => {
    commitSnapshot((prev) => ({ ...prev, rootZone: createZone("root") }));
    setSelectedZoneId(null);
  };

  const handleSave = async () => {
    if (!layoutId) return;
    setSaving(true);
    const layoutData = normalizeZoneForSave(rootZone);
    const { error } = await supabase.from("layouts").update({
      layout_data: layoutData as any,
      background_color: backgroundColor,
      updated_at: new Date().toISOString(),
    }).eq("id", layoutId);

    if (!error) {
      const { data: saved, error: verifyError } = await supabase
        .from("layouts")
        .select("layout_data, background_color")
        .eq("id", layoutId)
        .single();

      if (verifyError || !saved?.layout_data) {
        setSaving(false);
        toast.error(verifyError?.message || "Save could not be verified");
        return;
      }

      const parsedVerify = typeof saved.layout_data === "string" 
        ? JSON.parse(saved.layout_data) 
        : saved.layout_data;

      snapshotRef.current = { 
        rootZone: parsedVerify as ScreenZone, 
        backgroundColor: saved.background_color,
      };
      setRootZone(parsedVerify as ScreenZone);
      setBackgroundColor(saved.background_color);
    }

    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Layout saved!");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  if (isFullPreview) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor }}
        onClick={() => setIsFullPreview(false)}
      >
        <div className="absolute inset-0 overflow-hidden">
          <ZoneRenderer
            zone={rootZone}
            onUpdate={() => {}}
            onSelectZone={() => {}}
            selectedZoneId={null}
            previewMode
            customerInfoConfig={companyInfoConfig || undefined}
          />
        </div>
        <div className="absolute top-4 right-4">
          <Button variant="secondary" size="sm" onClick={() => setIsFullPreview(false)}>
            Exit Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4.25rem)] -m-6 p-4 gap-2.5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/layouts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <h1 className="text-lg font-bold tracking-tight">{layoutName}</h1>
              </div>
              <p className="text-xs text-muted-foreground">{resWidth}×{resHeight}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Language Converter Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-primary/20 shadow-sm">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <select
                value={currentLanguage}
                disabled={translating}
                onChange={(e) => handleTranslateLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                title="Translate all temple screen text via Google Translate"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
              {translating && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
            </div>

            {/* Global Font Family Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-primary/20 shadow-sm">
              <Type className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <select
                value={rootZone.content?.donationTitleFontFamily || rootZone.content?.fontFamily || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const applyFontToZone = (z: ScreenZone): ScreenZone => {
                    const updatedWidget: ContentWidget | undefined = z.content ? {
                      ...z.content,
                      fontFamily: val || undefined,
                      donationTitleFontFamily: val || undefined,
                      buttonFontFamily: val || undefined,
                      donationButtons: z.content.donationButtons?.map(b => ({
                        ...b,
                        fontFamily: val || undefined,
                      }))
                    } : undefined;
                    return {
                      ...z,
                      content: updatedWidget,
                      children: z.children ? [applyFontToZone(z.children[0]), applyFontToZone(z.children[1])] : undefined
                    };
                  };
                  const newRoot = applyFontToZone(rootZone);
                  commitSnapshot(prev => ({ ...prev, rootZone: newRoot }));
                  toast.success("Font updated across layout!");
                }}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                title="Select font for entire template/screen"
              >
                <option value="" className="bg-zinc-900 text-white">Default Font</option>
                <optgroup label="Indian & Temple Scripts" className="bg-zinc-900 text-amber-300 font-bold">
                  {SUPPORTED_FONTS.filter(f => f.category === 'Indian & Temple').map(f => (
                    <option key={f.name} value={f.family} className="bg-zinc-900 text-white font-normal">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Modern Sans" className="bg-zinc-900 text-sky-300 font-bold">
                  {SUPPORTED_FONTS.filter(f => f.category === 'Modern Sans').map(f => (
                    <option key={f.name} value={f.family} className="bg-zinc-900 text-white font-normal">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Classic Serif" className="bg-zinc-900 text-emerald-300 font-bold">
                  {SUPPORTED_FONTS.filter(f => f.category === 'Classic Serif').map(f => (
                    <option key={f.name} value={f.family} className="bg-zinc-900 text-white font-normal">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Display" className="bg-zinc-900 text-purple-300 font-bold">
                  {SUPPORTED_FONTS.filter(f => f.category === 'Display').map(f => (
                    <option key={f.name} value={f.family} className="bg-zinc-900 text-white font-normal">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={handleUndo} disabled={history.past.length === 0}>
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={history.future.length === 0}>
              <Redo2 className="h-3.5 w-3.5 mr-1.5" />
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsFullPreview(true)}>
              <Maximize className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Layout"}
            </Button>
          </div>
        </div>

        {/* Main Editor 3-Column Studio */}
        <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Left Palette & Background Panel */}
          <div className="w-60 lg:w-64 shrink-0 bg-card/60 border border-border/50 rounded-2xl p-3.5 shadow-sm flex flex-col h-full overflow-hidden backdrop-blur-md">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-4">
                <WidgetPalette onSelectWidget={(type, style) => {
                  const widget = createWidget(type, style);
                  if (selectedZoneId) {
                    const target = findZone(rootZone, selectedZoneId);
                    if (target) {
                      handleZoneUpdate({ ...target, content: widget });
                      return;
                    }
                  }
                  handleZoneUpdate({ ...rootZone, content: widget });
                }} />
                <Separator />
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Canvas Background</h3>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => commitSnapshot((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-8 w-8 rounded-lg cursor-pointer border border-border/50 shrink-0"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => commitSnapshot((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-8 text-xs font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Center - Canvas Workspace */}
          <div className="flex-1 min-w-0 bg-muted/15 rounded-2xl border border-border/40 overflow-hidden p-4 flex items-center justify-center h-full relative">
            <div
              className="rounded-xl overflow-hidden shadow-2xl border border-border/40 max-w-full max-h-full transition-all"
              style={{
                backgroundColor,
                aspectRatio: canvasRatio,
                width: "100%",
                maxHeight: "100%",
                height: "auto",
              }}
              onClick={() => setSelectedZoneId(null)}
            >
              <ZoneRenderer
                zone={rootZone}
                onUpdate={handleZoneUpdate}
                onSelectZone={setSelectedZoneId}
                selectedZoneId={selectedZoneId}
                customerInfoConfig={companyInfoConfig || undefined}
              />
            </div>
          </div>

          {/* Right Properties Panel */}
          <div className="w-80 lg:w-96 shrink-0 bg-card/60 border border-border/50 rounded-2xl p-3.5 shadow-sm flex flex-col h-full overflow-hidden backdrop-blur-md">
            <ScrollArea className="h-full pr-2">
              <div>
                {selectedWidget ? (
                  <ZoneProperties widget={selectedWidget} onUpdate={handleWidgetUpdate} contentItems={contentItems} />
                ) : (
                  <div className="text-center py-16 text-muted-foreground space-y-2">
                    <LayoutGrid className="size-8 mx-auto text-muted-foreground/40 stroke-1" />
                    <p className="text-sm font-semibold">No zone selected</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                      Click a zone on the screen canvas or choose a widget from the left palette to configure properties.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
