import { ContentWidget, TextAnimation, SlideshowItem, SlideTransition, LinkItem, LinkPlatform, MAX_LINKS, createSlide, detectPlatform } from "@/lib/screen-editor-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Image, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PlaylistEditor } from "./PlaylistEditor";
import { SUPPORTED_FONTS } from "@/lib/fonts";
import { toast } from "sonner";

export interface MediaContentItem {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
}

interface ZonePropertiesProps {
  widget: ContentWidget;
  onUpdate: (widget: ContentWidget) => void;
  contentItems?: MediaContentItem[];
}

const textAnimations: { value: TextAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'scroll-left', label: 'Scroll Left (Marquee)' },
  { value: 'scroll-right', label: 'Scroll Right' },
  { value: 'scroll-up', label: 'Scroll Up' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'fade', label: 'Pulse / Fade' },
  { value: 'blink', label: 'Blink' },
];

const slideTransitions: { value: SlideTransition; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'flip', label: 'Flip' },
  { value: 'none', label: 'Instant (No animation)' },
];

/* ── Single Slide Editor ── */
function SlideEditor({
  slide,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  images = [],
}: {
  slide: SlideshowItem;
  index: number;
  total: number;
  onUpdate: (s: SlideshowItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  images?: MediaContentItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
          {slide.imageUrl ? (
            <img src={slide.imageUrl} alt="" className="h-full w-full rounded object-cover" />
          ) : (
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{slide.imageName || `Slide ${index + 1}`}</p>
          <p className="text-[10px] text-muted-foreground">{slide.duration}s · {slide.transition}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {index > 0 && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {index < total - 1 && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="p-2.5 pt-0 space-y-3 border-t border-border/50">
          {/* Image picker from library */}
          {images.length > 0 && (
            <div className="space-y-1 pt-2">
              <Label className="text-[10px]">Select from Library</Label>
              <div className="grid grid-cols-3 gap-1">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => onUpdate({ ...slide, imageUrl: img.file_url!, imageName: img.name })}
                    className={cn(
                      "relative rounded overflow-hidden border aspect-square transition-all",
                      slide.imageUrl === img.file_url
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={img.file_url!} alt={img.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 pt-2">
            <Label className="text-[10px]">Image Name / URL</Label>
            <Input
              value={slide.imageName}
              onChange={(e) => onUpdate({ ...slide, imageName: e.target.value })}
              placeholder="promo-banner.jpg"
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Duration ({slide.duration}s)</Label>
            <Slider
              value={[slide.duration]}
              onValueChange={([v]) => onUpdate({ ...slide, duration: v })}
              min={1}
              max={60}
              step={1}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Transition</Label>
            <Select value={slide.transition} onValueChange={(v) => onUpdate({ ...slide, transition: v as SlideTransition })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slideTransitions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Fit Mode</Label>
            <Select value={slide.objectFit} onValueChange={(v) => onUpdate({ ...slide, objectFit: v as 'cover' | 'contain' | 'fill' })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Overlay text */}
          <div className="space-y-1">
            <Label className="text-[10px]">Overlay Text (optional)</Label>
            <Input
              value={slide.overlayText || ''}
              onChange={(e) => onUpdate({ ...slide, overlayText: e.target.value })}
              placeholder="Sale 50% Off!"
              className="h-7 text-xs"
            />
          </div>

          {slide.overlayText && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Font Size</Label>
                  <Input
                    type="number"
                    value={slide.overlayFontSize || 16}
                    onChange={(e) => onUpdate({ ...slide, overlayFontSize: parseInt(e.target.value) || 16 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Color</Label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={slide.overlayColor || '#ffffff'}
                      onChange={(e) => onUpdate({ ...slide, overlayColor: e.target.value })}
                      className="h-7 w-7 rounded cursor-pointer border-none"
                    />
                    <Input
                      value={slide.overlayColor || '#ffffff'}
                      onChange={(e) => onUpdate({ ...slide, overlayColor: e.target.value })}
                      className="h-7 text-[10px] font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Text Animation</Label>
                <Select
                  value={slide.overlayAnimation || 'none'}
                  onValueChange={(v) => onUpdate({ ...slide, overlayAnimation: v as TextAnimation })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {textAnimations.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Properties Panel ── */
export function ZoneProperties({ widget, onUpdate, contentItems = [] }: ZonePropertiesProps) {
  const update = (partial: Partial<ContentWidget>) => onUpdate({ ...widget, ...partial });
  const images = contentItems.filter((c) => c.type === "image" && c.file_url);
  const videos = contentItems.filter((c) => c.type === "video" && c.file_url);

  const [activeTab, setActiveTab] = useState<'template' | 'buttons'>('template');
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);

  useEffect(() => {
    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.widgetId === widget.id) {
        setActiveTab('buttons');
        setEditingButtonId(detail.buttonId);
      }
    };
    window.addEventListener("select-donation-button", handleSelect);
    return () => window.removeEventListener("select-donation-button", handleSelect);
  }, [widget.id]);

  const updateSlide = (index: number, slide: SlideshowItem) => {
    const slides = [...(widget.slides || [])];
    slides[index] = slide;
    update({ slides });
  };

  const removeSlide = (index: number) => {
    const slides = (widget.slides || []).filter((_, i) => i !== index);
    update({ slides });
  };

  const moveSlide = (from: number, to: number) => {
    const slides = [...(widget.slides || [])];
    const [item] = slides.splice(from, 1);
    slides.splice(to, 0, item);
    update({ slides });
  };

  const addSlide = () => {
    update({ slides: [...(widget.slides || []), createSlide()] });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Properties — {widget.label}
      </h3>

      {/* ── SLIDESHOW ── */}
      {widget.type === 'slideshow' && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Loop</Label>
            <Switch
              checked={widget.slideshowLoop !== false}
              onCheckedChange={(v) => update({ slideshowLoop: v })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{(widget.slides || []).length} Slides</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addSlide}>
              <Plus className="h-3 w-3 mr-1" />
              Add Slide
            </Button>
          </div>

          <div className="space-y-2">
            {(widget.slides || []).map((slide, i) => (
              <SlideEditor
                key={slide.id}
                slide={slide}
                index={i}
                total={(widget.slides || []).length}
                onUpdate={(s) => updateSlide(i, s)}
                onRemove={() => removeSlide(i)}
                onMoveUp={() => moveSlide(i, i - 1)}
                onMoveDown={() => moveSlide(i, i + 1)}
                images={images}
              />
            ))}
          </div>
        </>
      )}

      {/* ── LINKS ── */}
      {widget.type === 'links' && (() => {
        const links = widget.links || [];
        const setLinks = (next: LinkItem[]) => update({ links: next });
        const updateLink = (i: number, patch: Partial<LinkItem>) => {
          const next = [...links];
          next[i] = { ...next[i], ...patch };
          setLinks(next);
        };
        const addLink = () => {
          if (links.length >= MAX_LINKS) return;
          setLinks([...links, { id: `link-${Date.now()}`, url: '', label: 'New Link', platform: 'website' }]);
        };
        const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Orientation</Label>
              <Select
                value={widget.linksOrientation || 'auto'}
                onValueChange={(v) => update({ linksOrientation: v as 'auto' | 'horizontal' | 'vertical' })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (fits zone shape)</SelectItem>
                  <SelectItem value="horizontal">Horizontal Bar</SelectItem>
                  <SelectItem value="vertical">Vertical Bar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Drop this widget in a thin zone (split a section, then resize the divider).
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{links.length} / {MAX_LINKS} Links</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addLink} disabled={links.length >= MAX_LINKS}>
                <Plus className="h-3 w-3 mr-1" /> Add Link
              </Button>
            </div>

            <div className="space-y-3">
              {links.map((link, i) => (
                <div key={link.id} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Link {i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => removeLink(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">URL (paste any link)</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => {
                        const url = e.target.value;
                        updateLink(i, { url, platform: detectPlatform(url) });
                      }}
                      placeholder="https://instagram.com/your-handle"
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Display Label</Label>
                      <Input
                        value={link.label}
                        onChange={(e) => updateLink(i, { label: e.target.value })}
                        placeholder="Follow us"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Platform / Icon</Label>
                      <Select value={link.platform} onValueChange={(v) => updateLink(i, { platform: v as LinkPlatform })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="twitter">Twitter / X</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="github">GitHub</SelectItem>
                          <SelectItem value="website">Website / Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Button Color (override)</Label>
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={link.iconColor || '#1f2937'}
                        onChange={(e) => updateLink(i, { iconColor: e.target.value })}
                        className="h-7 w-7 rounded cursor-pointer border-none"
                      />
                      <Input
                        value={link.iconColor || ''}
                        onChange={(e) => updateLink(i, { iconColor: e.target.value })}
                        placeholder="(uses platform color)"
                        className="h-7 text-[10px] font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {links.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-3">
                  No links yet. Click "Add Link" to start.
                </p>
              )}
            </div>
          </>
        );
      })()}

      {/* ── DONATION ── */}
      {widget.type === 'donation' && (() => {
        const buttons = widget.donationButtons || [];
        const setButtons = (next: any[]) => update({ donationButtons: next });
        const updateButton = (i: number, patch: any) => {
          const next = [...buttons];
          next[i] = { ...next[i], ...patch };
          setButtons(next);
        };
        const addButton = () => {
          setButtons([...buttons, { 
            id: `btn-${Date.now()}`, 
            amount: 100, 
            label: 'New Offering', 
            description: 'Provide details here',
            hoverEffect: 'scale',
            clickAnimation: 'pop',
            visible: true
          }]);
        };
        const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));
        const moveButton = (from: number, to: number) => {
          const next = [...buttons];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          setButtons(next);
        };

        return (
          <>
            {/* Tabs for Template vs Offering Buttons */}
            <div className="flex border-b border-border/80 mb-3 bg-muted/20 rounded p-0.5">
              <button
                type="button"
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
                  activeTab === 'template'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab('template')}
              >
                Template
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
                  activeTab === 'buttons'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab('buttons')}
              >
                Offering Cards ({buttons.length})
              </button>
            </div>

            {activeTab === 'template' ? (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Template Preset</Label>
                  <div className="text-xs font-bold text-amber-500 capitalize bg-muted/40 border border-border/50 p-2 rounded flex items-center justify-between">
                    <span>Temple {widget.templateStyle || 'modern'}</span>
                    <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">Preset</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Main Title</Label>
                  <Input
                    value={widget.donationTitle || ''}
                    onChange={(e) => update({ donationTitle: e.target.value })}
                    placeholder="Offer Your Daan"
                    className="h-8 text-xs"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Subtitle / Purpose</Label>
                  <Input
                    value={widget.donationPurpose || ''}
                    onChange={(e) => update({ donationPurpose: e.target.value })}
                    placeholder="Choose Your Seva Offering"
                    className="h-8 text-xs"
                  />
                </div>

                {images.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs">Select Temple Logo</Label>
                    <div className="grid grid-cols-4 gap-1.5 max-h-[90px] overflow-y-auto border border-border/50 p-1 rounded bg-muted/20">
                      {images.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => update({ templeLogoUrl: item.file_url!, templeLogoName: item.name })}
                          className={cn(
                            "relative rounded overflow-hidden border transition-all aspect-square",
                            widget.templeLogoUrl === item.file_url
                              ? "border-primary ring-1 ring-primary"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <img src={item.file_url!} alt={item.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    {widget.templeLogoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] w-full"
                        onClick={() => update({ templeLogoUrl: undefined, templeLogoName: undefined })}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                )}

                <Separator className="my-2 opacity-50" />

                <div className="space-y-1.5">
                  <Label className="text-xs">Title Text Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={widget.donationTitleColor || '#fbbf24'} onChange={(e) => update({ donationTitleColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
                    <Input value={widget.donationTitleColor || '#fbbf24'} onChange={(e) => update({ donationTitleColor: e.target.value })} className="h-8 text-xs font-mono flex-1" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Subtitle Text Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={widget.donationSubtitleColor || '#e2e8f0'} onChange={(e) => update({ donationSubtitleColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
                    <Input value={widget.donationSubtitleColor || '#e2e8f0'} onChange={(e) => update({ donationSubtitleColor: e.target.value })} className="h-8 text-xs font-mono flex-1" />
                  </div>
                </div>



                <div className="space-y-1.5">
                  <Label className="text-xs">Title Font Size ({widget.donationTitleFontSize || 24}px)</Label>
                  <Slider
                    value={[widget.donationTitleFontSize || 24]}
                    onValueChange={([v]) => update({ donationTitleFontSize: v })}
                    min={16}
                    max={60}
                    step={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Grid Spacing ({widget.donationSpacing || 4})</Label>
                  <Slider
                    value={[widget.donationSpacing || 4]}
                    onValueChange={([v]) => update({ donationSpacing: v })}
                    min={1}
                    max={12}
                    step={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Container Border Radius ({widget.donationContainerRadius || 12}px)</Label>
                  <Slider
                    value={[widget.donationContainerRadius || 12]}
                    onValueChange={([v]) => update({ donationContainerRadius: v })}
                    min={0}
                    max={40}
                    step={1}
                    className="py-1"
                  />
                </div>



                <Separator className="my-2 opacity-50" />

                {/* Canvas Background Media (Image or Video) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Canvas Background Media</Label>
                    {widget.backgroundImageUrl || widget.backgroundVideoUrl ? (
                      <button
                        type="button"
                        onClick={() => update({ backgroundType: 'none', backgroundImageUrl: undefined, backgroundVideoUrl: undefined, backgroundMediaName: undefined })}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Remove Media
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950/40 p-1 rounded-lg border border-border/40 text-xs">
                    <button
                      type="button"
                      onClick={() => update({ backgroundType: 'image' })}
                      className={cn(
                        "py-1.5 rounded text-[11px] font-semibold transition-all text-center",
                        widget.backgroundType === 'image' || widget.backgroundImageUrl
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      🖼️ Image
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ backgroundType: 'video' })}
                      className={cn(
                        "py-1.5 rounded text-[11px] font-semibold transition-all text-center",
                        widget.backgroundType === 'video' || widget.backgroundVideoUrl
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      🎬 Video
                    </button>
                  </div>

                  {/* Image library selector */}
                  {(widget.backgroundType === 'image' || widget.backgroundImageUrl || !widget.backgroundType) && images.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Select Background Image</Label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-[100px] overflow-y-auto border border-border/30 p-1 rounded bg-slate-950/20">
                        {images.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => update({ backgroundType: 'image', backgroundImageUrl: img.file_url!, backgroundVideoUrl: undefined, backgroundMediaName: img.name })}
                            className={cn(
                              "relative rounded overflow-hidden border transition-all aspect-video",
                              widget.backgroundImageUrl === img.file_url
                                ? "border-primary ring-1 ring-primary"
                                : "border-border/30 hover:border-primary/40"
                            )}
                          >
                            <img src={img.file_url!} alt={img.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video library selector */}
                  {(widget.backgroundType === 'video' || widget.backgroundVideoUrl) && videos.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Select Background Video</Label>
                      <div className="grid grid-cols-3 gap-1.5 max-h-[100px] overflow-y-auto border border-border/30 p-1 rounded bg-slate-950/20">
                        {videos.map((vid) => (
                          <button
                            key={vid.id}
                            type="button"
                            onClick={() => update({ backgroundType: 'video', backgroundVideoUrl: vid.file_url!, backgroundImageUrl: undefined, backgroundMediaName: vid.name })}
                            className={cn(
                              "relative rounded overflow-hidden border transition-all aspect-video",
                              widget.backgroundVideoUrl === vid.file_url
                                ? "border-primary ring-1 ring-primary"
                                : "border-border/30 hover:border-primary/40"
                            )}
                          >
                            <video src={vid.file_url!} className="w-full h-full object-cover" muted />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Background Dim Slider */}
                  {(widget.backgroundImageUrl || widget.backgroundVideoUrl) && (
                    <div className="space-y-1.5 pt-1 bg-slate-950/40 p-2.5 rounded-lg border border-border/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold">Background Dim Overlay</Label>
                        <span className="text-[11px] font-mono font-bold text-amber-400">{widget.backgroundDim ?? 50}%</span>
                      </div>
                      <Slider
                        value={[widget.backgroundDim ?? 50]}
                        onValueChange={([v]) => update({ backgroundDim: v })}
                        min={0}
                        max={90}
                        step={5}
                        className="py-1"
                      />
                      <p className="text-[9px] text-muted-foreground">
                        Dims the background media so text and donation cards remain easy to read.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Max Cards Per Row (Placed at the very top of Offering Cards) */}
                {(() => {
                  const isMinimal = widget.templateStyle === 'minimal';
                  const options = isMinimal ? [4, 5, 6, 7] : [2, 3, 4];
                  const currentCardsPerRow = widget.cardsPerRow || (isMinimal ? 4 : 2);
                  return (
                    <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Max Cards Per Row</Label>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">{currentCardsPerRow} in a row</span>
                      </div>
                      <div className={cn(
                        "grid gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-border/40 text-xs",
                        isMinimal ? "grid-cols-4" : "grid-cols-3"
                      )}>
                        {options.map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => update({ cardsPerRow: num })}
                            className={cn(
                              "py-1.5 rounded text-[11px] font-bold transition-all text-center",
                              currentCardsPerRow === num
                                ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                          >
                            {num} Cards
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {isMinimal 
                          ? "Sets visible column cards (default: 4, options: 4, 5, 6, 7)." 
                          : "Sets max cards in 1 row (default: 2, options: 2, 3, 4). Remaining cards scroll vertically."
                        }
                      </p>
                    </div>
                  );
                })()}

                {/* All Cards Default Styling */}
                <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">All Cards Styling</Label>
                      <span className="text-[9px] text-muted-foreground block">Default color for all offering cards</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-[10px] px-2.5 bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap shrink-0 font-medium"
                      onClick={() => {
                        const updated = buttons.map(b => ({
                          ...b,
                          backgroundColor: widget.cardDefaultBgColor || b.backgroundColor,
                          borderColor: widget.cardDefaultBorderColor || b.borderColor,
                          textColor: widget.cardDefaultTextColor || b.textColor,
                          cornerRadius: widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : b.cornerRadius
                        }));
                        update({ donationButtons: updated });
                        toast.success("Applied style to all cards!");
                      }}
                    >
                      Apply To All
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">All Cards Background Color</Label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={widget.cardDefaultBgColor || '#1e1b4b'} 
                        onChange={(e) => update({ cardDefaultBgColor: e.target.value })} 
                        className="h-7 w-7 rounded cursor-pointer border-none" 
                      />
                      <Input 
                        value={widget.cardDefaultBgColor || ''} 
                        onChange={(e) => update({ cardDefaultBgColor: e.target.value })} 
                        placeholder="Template Default" 
                        className="h-7 text-xs font-mono flex-1 bg-slate-950/40" 
                      />
                      {widget.cardDefaultBgColor && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => update({ cardDefaultBgColor: undefined })}>Reset</Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">All Cards Border Color</Label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={widget.cardDefaultBorderColor || '#fbbf24'} 
                        onChange={(e) => update({ cardDefaultBorderColor: e.target.value })} 
                        className="h-7 w-7 rounded cursor-pointer border-none" 
                      />
                      <Input 
                        value={widget.cardDefaultBorderColor || ''} 
                        onChange={(e) => update({ cardDefaultBorderColor: e.target.value })} 
                        placeholder="Template Default" 
                        className="h-7 text-xs font-mono flex-1 bg-slate-950/40" 
                      />
                      {widget.cardDefaultBorderColor && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => update({ cardDefaultBorderColor: undefined })}>Reset</Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">All Cards Text Color</Label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={widget.cardDefaultTextColor || '#ffffff'} 
                        onChange={(e) => update({ cardDefaultTextColor: e.target.value })} 
                        className="h-7 w-7 rounded cursor-pointer border-none" 
                      />
                      <Input 
                        value={widget.cardDefaultTextColor || ''} 
                        onChange={(e) => update({ cardDefaultTextColor: e.target.value })} 
                        placeholder="Template Default" 
                        className="h-7 text-xs font-mono flex-1 bg-slate-950/40" 
                      />
                      {widget.cardDefaultTextColor && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => update({ cardDefaultTextColor: undefined })}>Reset</Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">All Cards Corner Radius ({widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 12}px)</Label>
                    <Slider 
                      value={[widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 12]} 
                      onValueChange={([v]) => update({ cardDefaultRadius: v })} 
                      min={0} 
                      max={40} 
                      step={1} 
                      className="py-1"
                    />
                  </div>
                </div>

                <Separator className="my-1.5 opacity-40" />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Offerings List</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 whitespace-nowrap shrink-0" onClick={addButton}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Card
                  </Button>
                </div>

                <div className="space-y-2">
                  {buttons.map((btn, i) => {
                    const isEditing = btn.id === editingButtonId;
                    return (
                      <div 
                        key={btn.id} 
                        className={cn(
                          "rounded-xl border p-2.5 space-y-2.5 transition-all duration-200 shadow-xs",
                          isEditing 
                            ? "bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30" 
                            : "bg-muted/20 border-border/60 hover:bg-muted/35 hover:border-border"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingButtonId(isEditing ? null : btn.id)}
                            className="flex-1 flex items-center gap-2 text-left group min-w-0 cursor-pointer"
                            title={isEditing ? "Click to collapse" : "Click to edit card"}
                          >
                            <div className={cn(
                              "h-6 px-2 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                              isEditing 
                                ? "bg-amber-500 text-slate-950 font-black shadow-xs" 
                                : "bg-white/10 text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-300"
                            )}>
                              <Pencil className="h-2.5 w-2.5 mr-1" />
                              {isEditing ? "Editing" : "Edit"}
                            </div>
                            <div className="truncate flex items-baseline gap-1.5 min-w-0">
                              <span className="text-[11px] font-bold text-foreground group-hover:text-amber-400 transition-colors truncate">
                                {btn.label || `Card ${i + 1}`}
                              </span>
                              <span className="text-[10px] text-amber-400/90 font-mono font-bold shrink-0">
                                (₹{btn.amount})
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => moveButton(i, i - 1)}
                              className="h-6 w-6 rounded hover:bg-muted/80 flex items-center justify-center disabled:opacity-20 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={i === buttons.length - 1}
                              onClick={() => moveButton(i, i + 1)}
                              className="h-6 w-6 rounded hover:bg-muted/80 flex items-center justify-center disabled:opacity-20 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <Switch
                              checked={btn.visible !== false}
                              onCheckedChange={(v) => updateButton(i, { visible: v })}
                              className="scale-75 origin-right"
                              title={btn.visible !== false ? "Card is visible" : "Card is hidden"}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer" 
                              onClick={() => removeButton(i)}
                              title="Delete Card"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="space-y-3.5 pt-2 border-t border-border/50 animate-slide-down">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Title</Label>
                                <Input
                                  value={btn.label}
                                  onChange={(e) => updateButton(i, { label: e.target.value })}
                                  placeholder="Archana Daan"
                                  className="h-7 text-xs bg-slate-950/40 border-slate-800"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Amount (₹)</Label>
                                <Input
                                  type="number"
                                  value={btn.amount}
                                  onChange={(e) => updateButton(i, { amount: Number(e.target.value) })}
                                  placeholder="101"
                                  className="h-7 text-xs bg-slate-950/40 border-slate-800"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px]">Details (Subtext Description)</Label>
                              <Input
                                value={btn.description || ''}
                                onChange={(e) => updateButton(i, { description: e.target.value })}
                                placeholder="e.g. Special puja for family"
                                className="h-7 text-xs bg-slate-950/40 border-slate-800"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px]">Badge Text</Label>
                              <Input
                                value={btn.badge || ''}
                                onChange={(e) => updateButton(i, { badge: e.target.value })}
                                placeholder="Popular, New, शुभ, standard..."
                                className="h-7 text-xs bg-slate-950/40 border-slate-800"
                              />
                            </div>

                            {images.length > 0 && (
                              <div className="space-y-1.5">
                                <Label className="text-[10px]">Center Card Icon</Label>
                                <div className="grid grid-cols-5 gap-1 max-h-[80px] overflow-y-auto border border-border/30 p-1 rounded bg-slate-950/20">
                                  {images.map((imgItem) => (
                                    <button
                                      key={imgItem.id}
                                      type="button"
                                      onClick={() => updateButton(i, { photoUrl: imgItem.file_url!, photoName: imgItem.name })}
                                      className={cn(
                                        "relative rounded overflow-hidden border transition-all aspect-square",
                                        btn.photoUrl === imgItem.file_url
                                          ? "border-primary ring-1 ring-primary"
                                          : "border-border/30 hover:border-primary/40"
                                      )}
                                    >
                                      <img src={imgItem.file_url!} alt={imgItem.name} className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                                {btn.photoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => updateButton(i, { photoUrl: undefined, photoName: undefined })}
                                    className="text-[9px] text-amber-500 hover:underline block text-right mt-0.5"
                                  >
                                    Remove Icon
                                  </button>
                                )}
                              </div>
                            )}

                            {images.length > 0 && (
                              <div className="space-y-1.5">
                                <Label className="text-[10px]">Card Background Image</Label>
                                <div className="grid grid-cols-5 gap-1 max-h-[80px] overflow-y-auto border border-border/30 p-1 rounded bg-slate-950/20">
                                  {images.map((imgItem) => (
                                    <button
                                      key={imgItem.id}
                                      type="button"
                                      onClick={() => updateButton(i, { backgroundUrl: imgItem.file_url!, backgroundName: imgItem.name })}
                                      className={cn(
                                        "relative rounded overflow-hidden border transition-all aspect-square",
                                        btn.backgroundUrl === imgItem.file_url
                                          ? "border-primary ring-1 ring-primary"
                                          : "border-border/30 hover:border-primary/40"
                                      )}
                                    >
                                      <img src={imgItem.file_url!} alt={imgItem.name} className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                                {btn.backgroundUrl && (
                                  <div className="space-y-1 pt-1 bg-slate-950/40 p-2 rounded border border-border/30">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[9px] font-bold">Card Dim Overlay</Label>
                                      <span className="text-[9px] font-mono font-bold text-amber-400">{btn.backgroundDim ?? 55}%</span>
                                    </div>
                                    <Slider
                                      value={[btn.backgroundDim ?? 55]}
                                      onValueChange={([v]) => updateButton(i, { backgroundDim: v })}
                                      min={0}
                                      max={90}
                                      step={5}
                                      className="py-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateButton(i, { backgroundUrl: undefined, backgroundName: undefined })}
                                      className="text-[9px] text-destructive hover:underline block text-right mt-0.5"
                                    >
                                      Remove Background Image
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <Separator className="my-1.5 opacity-30" />

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[9px]">Bg Color Override</Label>
                                <div className="flex gap-1">
                                  <input 
                                    type="color" 
                                    value={btn.backgroundColor || '#000000'} 
                                    onChange={(e) => updateButton(i, { backgroundColor: e.target.value })} 
                                    className="h-6 w-6 rounded cursor-pointer border-none" 
                                  />
                                  <Input 
                                    value={btn.backgroundColor || ''} 
                                    onChange={(e) => updateButton(i, { backgroundColor: e.target.value })} 
                                    placeholder="Default"
                                    className="h-6 text-[10px] px-1 font-mono flex-1 bg-slate-950/40" 
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px]">Border Color Override</Label>
                                <div className="flex gap-1">
                                  <input 
                                    type="color" 
                                    value={btn.borderColor || '#000000'} 
                                    onChange={(e) => updateButton(i, { borderColor: e.target.value })} 
                                    className="h-6 w-6 rounded cursor-pointer border-none" 
                                  />
                                  <Input 
                                    value={btn.borderColor || ''} 
                                    onChange={(e) => updateButton(i, { borderColor: e.target.value })} 
                                    placeholder="None"
                                    className="h-6 text-[10px] px-1 font-mono flex-1 bg-slate-950/40" 
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <Label className="text-[9px]">Text Color Override</Label>
                                <div className="flex gap-1">
                                  <input 
                                    type="color" 
                                    value={btn.textColor || '#ffffff'} 
                                    onChange={(e) => updateButton(i, { textColor: e.target.value })} 
                                    className="h-6 w-6 rounded cursor-pointer border-none" 
                                  />
                                  <Input 
                                    value={btn.textColor || ''} 
                                    onChange={(e) => updateButton(i, { textColor: e.target.value })} 
                                    placeholder="Default"
                                    className="h-6 text-[10px] px-1 font-mono flex-1 bg-slate-950/40" 
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px]">Corner Radius Override</Label>
                                <Input 
                                  type="number"
                                  value={btn.cornerRadius !== undefined ? btn.cornerRadius : ''} 
                                  onChange={(e) => updateButton(i, { cornerRadius: e.target.value !== '' ? Number(e.target.value) : undefined })} 
                                  placeholder="Default"
                                  className="h-6 text-[10px] bg-slate-950/40" 
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {buttons.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-3">
                      No offering buttons. Click "Add Card" to start.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* ── TEXT / RSS ── */}
      {(widget.type === 'text' || widget.type === 'rss') && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              value={widget.text || ''}
              onChange={(e) => update({ text: e.target.value })}
              className="text-sm min-h-[60px] resize-none"
              placeholder="Enter text..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Font Size ({widget.fontSize}px)</Label>
            <Slider
              value={[widget.fontSize || 24]}
              onValueChange={([v]) => update({ fontSize: v })}
              min={8}
              max={120}
              step={1}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Font Weight</Label>
            <Select value={widget.fontWeight || '400'} onValueChange={(v) => update({ fontWeight: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light</SelectItem>
                <SelectItem value="400">Normal</SelectItem>
                <SelectItem value="600">Semibold</SelectItem>
                <SelectItem value="700">Bold</SelectItem>
                <SelectItem value="800">Extra Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Text Color</Label>
            <div className="flex gap-2">
              <input type="color" value={widget.textColor || '#ffffff'} onChange={(e) => update({ textColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
              <Input value={widget.textColor || '#ffffff'} onChange={(e) => update({ textColor: e.target.value })} className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">Text Animation</Label>
            <Select value={widget.textAnimation || 'none'} onValueChange={(v) => update({ textAnimation: v as TextAnimation })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {textAnimations.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {widget.textAnimation && widget.textAnimation !== 'none' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Scroll Duration ({widget.scrollDuration || 10}s)</Label>
                <Slider
                  value={[widget.scrollDuration || 10]}
                  onValueChange={([v]) => update({ scrollDuration: v })}
                  min={2}
                  max={60}
                  step={1}
                />
                <p className="text-[10px] text-muted-foreground">Lower = faster scroll</p>
              </div>
            </>
          )}
        </>
      )}

      {/* ── CLOCK ── */}
      {widget.type === 'clock' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Font Size ({widget.fontSize}px)</Label>
            <Slider value={[widget.fontSize || 48]} onValueChange={([v]) => update({ fontSize: v })} min={16} max={120} step={1} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <input type="color" value={widget.textColor || '#ffffff'} onChange={(e) => update({ textColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
              <Input value={widget.textColor || '#ffffff'} onChange={(e) => update({ textColor: e.target.value })} className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>
        </>
      )}

      {/* ── IMAGE / VIDEO ── */}
      {(widget.type === 'image' || widget.type === 'video') && (
        <>
              {/* Single-media Library Picker */}
              {(widget.type === 'image' ? images : videos).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Select from Library</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
                    {(widget.type === 'image' ? images : videos).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => update({ mediaUrl: item.file_url!, mediaName: item.name })}
                        className={cn(
                          "relative rounded-md overflow-hidden border transition-all aspect-video",
                          widget.mediaUrl === item.file_url
                            ? "border-primary ring-1 ring-primary"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {item.type === 'image' ? (
                          <img src={item.file_url!} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <video
                            src={item.file_url!}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                          />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[9px] text-white truncate">{item.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Media Name</Label>
                <Input value={widget.mediaName || ''} onChange={(e) => update({ mediaName: e.target.value })} placeholder="e.g. promo-banner.jpg" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fit Mode</Label>
                <Select value={widget.objectFit || 'cover'} onValueChange={(v) => update({ objectFit: v as 'cover' | 'contain' | 'fill' })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="fill">Fill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
        </>
      )}

      {/* ── CUSTOM INDIVIDUAL DONATION BUTTONS ── */}
      {(widget.type === 'donation_button' || widget.type === 'circle_button' || widget.type === 'rectangular_button' || widget.type === 'square_button') && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Offering Title</Label>
            <Input
              value={widget.label || ''}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="e.g. Archana Daan"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Offering Subtitle / Details</Label>
            <Input
              value={widget.buttonDescription || ''}
              onChange={(e) => update({ buttonDescription: e.target.value })}
              placeholder="e.g. Offering dedicated to deity"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Offering Amount (INR)</Label>
            <Input
              type="number"
              value={widget.buttonAmount || 0}
              onChange={(e) => update({ buttonAmount: Number(e.target.value) })}
              placeholder="e.g. 101"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Badge Text</Label>
            <Input
              value={widget.buttonBadge || ''}
              onChange={(e) => update({ buttonBadge: e.target.value })}
              placeholder="e.g. Popular, शुभ"
              className="h-8 text-xs"
            />
          </div>

          {images.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Select Center Icon / Photo</Label>
              <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto border border-border/50 p-1 rounded bg-muted/20">
                {images.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update({ buttonPhotoUrl: item.file_url!, buttonPhotoName: item.name })}
                    className={cn(
                      "relative rounded overflow-hidden border transition-all aspect-square",
                      widget.buttonPhotoUrl === item.file_url
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={item.file_url!} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {widget.buttonPhotoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] w-full"
                  onClick={() => update({ buttonPhotoUrl: undefined, buttonPhotoName: undefined })}
                >
                  Clear Center Photo
                </Button>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Select Background Image</Label>
              <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto border border-border/50 p-1 rounded bg-muted/20">
                {images.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => update({ buttonBackgroundUrl: item.file_url!, buttonBackgroundName: item.name })}
                    className={cn(
                      "relative rounded overflow-hidden border transition-all aspect-square",
                      widget.buttonBackgroundUrl === item.file_url
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={item.file_url!} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {widget.buttonBackgroundUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] w-full"
                  onClick={() => update({ buttonBackgroundUrl: undefined, buttonBackgroundName: undefined })}
                >
                  Clear Background Image
                </Button>
              )}
            </div>
          )}

          <Separator className="my-2" />

          <div className="space-y-1.5">
            <Label className="text-xs">Card Bg Color</Label>
            <div className="flex gap-2">
              <input type="color" value={widget.buttonBgColor || '#000000'} onChange={(e) => update({ buttonBgColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
              <Input value={widget.buttonBgColor || ''} onChange={(e) => update({ buttonBgColor: e.target.value })} placeholder="Default" className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Card Border Color</Label>
            <div className="flex gap-2">
              <input type="color" value={widget.buttonBorderColor || '#000000'} onChange={(e) => update({ buttonBorderColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
              <Input value={widget.buttonBorderColor || ''} onChange={(e) => update({ buttonBorderColor: e.target.value })} placeholder="Default" className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Card Text Color</Label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={widget.buttonTextColor || '#ffffff'} 
                onChange={(e) => update({ buttonTextColor: e.target.value })} 
                className="h-8 w-8 rounded cursor-pointer border-none" 
              />
              <Input 
                value={widget.buttonTextColor || ''} 
                onChange={(e) => update({ buttonTextColor: e.target.value })} 
                placeholder="Default" 
                className="h-8 text-xs font-mono flex-1" 
              />
              {widget.buttonTextColor && (
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => update({ buttonTextColor: undefined })}>Reset</Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Card Corner Radius ({widget.buttonCornerRadius !== undefined ? widget.buttonCornerRadius : 12}px)</Label>
            <Slider value={[widget.buttonCornerRadius !== undefined ? widget.buttonCornerRadius : 12]} onValueChange={([v]) => update({ buttonCornerRadius: v })} min={0} max={40} step={1} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Background Gradient</Label>
            <Input value={widget.buttonGradient || ''} onChange={(e) => update({ buttonGradient: e.target.value })} placeholder="e.g. from-amber-500 to-orange-600" className="h-8 text-xs" />
          </div>
        </>
      )}

      {/* ── Universal styling (for non-donation widgets) ── */}
      {widget.type !== 'donation' && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs">Background Color</Label>
            <div className="flex gap-2">
              <input type="color" value={widget.backgroundColor || '#000000'} onChange={(e) => update({ backgroundColor: e.target.value })} className="h-8 w-8 rounded cursor-pointer border-none" />
              <Input value={widget.backgroundColor || 'transparent'} onChange={(e) => update({ backgroundColor: e.target.value })} className="h-8 text-xs font-mono flex-1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Padding ({widget.padding}px)</Label>
            <Slider value={[widget.padding || 0]} onValueChange={([v]) => update({ padding: v })} min={0} max={60} step={2} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Border Radius ({widget.borderRadius}px)</Label>
            <Slider value={[widget.borderRadius || 0]} onValueChange={([v]) => update({ borderRadius: v })} min={0} max={50} step={1} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opacity ({widget.opacity}%)</Label>
            <Slider value={[widget.opacity ?? 100]} onValueChange={([v]) => update({ opacity: v })} min={10} max={100} step={5} />
          </div>
        </>
      )}
    </div>
  );
}
