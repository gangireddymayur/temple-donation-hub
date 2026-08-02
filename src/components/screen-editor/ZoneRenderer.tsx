import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import {
  ScreenZone,
  ContentWidget,
  ContentWidgetType,
  SlideshowItem,
  SlideTransition,
  LinkPlatform,
  PlaylistItem,
  splitZone,
  createWidget,
} from "@/lib/screen-editor-types";
import {
  SplitSquareHorizontal,
  SplitSquareVertical,
  Trash2,
  GripVertical,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Github,
  Globe,
  Music2,
  HeartHandshake,
  Coins,
  QrCode,
  Sparkles,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = (import.meta as any).env?.VITE_API_URL || "/api";

const platformMeta: Record<LinkPlatform, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Instagram, color: '#E1306C', label: 'Instagram' },
  youtube:   { icon: Youtube,   color: '#FF0000', label: 'YouTube' },
  facebook:  { icon: Facebook,  color: '#1877F2', label: 'Facebook' },
  twitter:   { icon: Twitter,   color: '#1DA1F2', label: 'Twitter / X' },
  tiktok:    { icon: Music2,    color: '#000000', label: 'TikTok' },
  linkedin:  { icon: Linkedin,  color: '#0A66C2', label: 'LinkedIn' },
  github:    { icon: Github,    color: '#24292e', label: 'GitHub' },
  website:   { icon: Globe,     color: '#0ea5e9', label: 'Website' },
};

function LinksWidget({ widget, interactive }: { widget: ContentWidget; interactive: boolean }) {
  // Show all links in the editor (even empty ones) so the user sees the slots.
  // In live preview, only show ones that have a URL.
  const links = interactive
    ? (widget.links || []).filter(l => l.url)
    : (widget.links || []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoHorizontal, setAutoHorizontal] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setAutoHorizontal(width >= height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setting = widget.linksOrientation || 'auto';
  const isHorizontal = setting === 'auto' ? autoHorizontal : setting === 'horizontal';

  const style: React.CSSProperties = {
    backgroundColor: widget.backgroundColor || 'transparent',
    padding: widget.padding,
    borderRadius: widget.borderRadius,
    opacity: (widget.opacity ?? 100) / 100,
    pointerEvents: interactive ? 'none' : 'auto',
  };

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full flex overflow-hidden", isHorizontal ? "flex-row" : "flex-col")}
      style={style}
    >
      {links.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
          No links configured
        </div>
      ) : links.map((link) => {
        const meta = platformMeta[link.platform];
        const Icon = meta.icon;
        const bg = link.iconColor || meta.color;
        const handleClick = (e: React.MouseEvent) => {
          if (!interactive || !link.url) return;
          e.stopPropagation();
          const event = new CustomEvent("open-player-url", { detail: { url: link.url } });
          window.dispatchEvent(event);
        };
        return (
          <button
            key={link.id}
            onClick={handleClick}
            title={link.url || meta.label}
            className={cn(
              "min-w-0 min-h-0 flex flex-1 basis-0 items-center justify-center gap-1.5 px-2 transition-colors",
              isHorizontal ? "border-r border-background/20 last:border-r-0" : "border-b border-background/20 last:border-b-0",
              interactive && link.url ? "cursor-pointer hover:scale-[1.03]" : "cursor-default",
              !link.url && "opacity-70",
            )}
            style={{ backgroundColor: bg, color: '#fff', pointerEvents: interactive && link.url ? 'auto' : 'none' }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-semibold truncate">{link.label || meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}


interface ZoneRendererProps {
  zone: ScreenZone;
  onUpdate: (zone: ScreenZone) => void;
  onSelectZone: (zoneId: string) => void;
  selectedZoneId: string | null;
  depth?: number;
  previewMode?: boolean;
  customerInfoConfig?: CustomerInfoConfig;
}

/* ── Transition CSS for slideshow ── */
function getTransitionStyle(transition: SlideTransition, isActive: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transition: 'all 0.8s ease-in-out',
  };

  if (isActive) {
    return { ...base, opacity: 1, transform: 'translate(0,0) scale(1) rotateY(0deg)' };
  }

  switch (transition) {
    case 'fade':
      return { ...base, opacity: 0 };
    case 'slide-left':
      return { ...base, opacity: 0, transform: 'translateX(-100%)' };
    case 'slide-right':
      return { ...base, opacity: 0, transform: 'translateX(100%)' };
    case 'slide-up':
      return { ...base, opacity: 0, transform: 'translateY(-100%)' };
    case 'slide-down':
      return { ...base, opacity: 0, transform: 'translateY(100%)' };
    case 'zoom-in':
      return { ...base, opacity: 0, transform: 'scale(0.3)' };
    case 'zoom-out':
      return { ...base, opacity: 0, transform: 'scale(1.5)' };
    case 'flip':
      return { ...base, opacity: 0, transform: 'rotateY(90deg)' };
    case 'none':
      return { ...base, opacity: 0 };
    default:
      return { ...base, opacity: 0 };
  }
}

/* ── Slideshow Player ── */
function SlideshowPreview({ widget }: { widget: ContentWidget }) {
  const slides = widget.slides || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const currentSlide = slides[currentIndex];
    const duration = (currentSlide?.duration || 5) * 1000;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= slides.length) {
          return widget.slideshowLoop ? 0 : prev;
        }
        return next;
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [currentIndex, slides, widget.slideshowLoop]);

  if (slides.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <span className="text-xs">No slides added</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ perspective: '1000px' }}>
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div key={slide.id} style={getTransitionStyle(slide.transition, isActive)}>
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.imageName}
                className="w-full h-full"
                style={{ objectFit: slide.objectFit || 'cover' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <div className="text-lg">🖼️</div>
                  <span className="text-[10px]">{slide.imageName || `Slide ${index + 1}`}</span>
                </div>
              </div>
            )}
            {/* Overlay text */}
            {slide.overlayText && (
              <div className="absolute inset-0 flex items-end p-3">
                <OverlayText slide={slide} />
              </div>
            )}
          </div>
        );
      })}

      {/* Slide indicator dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OverlayText({ slide }: { slide: SlideshowItem }) {
  const animClass = (() => {
    switch (slide.overlayAnimation) {
      case 'scroll-left': return 'animate-marquee';
      case 'fade': return 'animate-pulse-glow';
      case 'blink': return 'animate-blink';
      case 'typewriter': return 'animate-typewriter overflow-hidden whitespace-nowrap';
      default: return '';
    }
  })();

  return (
    <div
      className={cn("whitespace-nowrap", animClass)}
      style={{
        fontSize: slide.overlayFontSize || 16,
        color: slide.overlayColor || '#ffffff',
        textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        fontWeight: 600,
      }}
    >
      {slide.overlayText}
    </div>
  );
}

/* ── Square Offering Card Widget (Universal Component) ── */
export function SquareOfferingCard({
  config,
  interactive,
  isSelected = false,
  onSelect,
  customerInfoConfig
}: {
  config: DonationButtonConfig;
  interactive: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  customerInfoConfig?: CustomerInfoConfig;
}) {
  const [activeDonation, setActiveDonation] = useState<any>(null);
  
  // Devotee details states
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorState, setDonorState] = useState("");
  const [donorPincode, setDonorPincode] = useState("");
  const [donorGotra, setDonorGotra] = useState("");
  const [donorNakshatra, setDonorNakshatra] = useState("");
  const [specialPrayer, setSpecialPrayer] = useState("");

  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  // Payment states
  const [donationId, setDonationId] = useState<string | null>(null);
  const [upiString, setUpiString] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const amount = config.amount || 100;
  const label = config.label || "Offering";
  const description = config.description || "";

  const defaultFields = {
    name: { enabled: true, required: true },
    phone: { enabled: true, required: true },
    email: { enabled: true, required: false },
    address: { enabled: false, required: false },
    city: { enabled: false, required: false },
    state: { enabled: false, required: false },
    pincode: { enabled: false, required: false },
    gotra: { enabled: false, required: false },
    nakshatra: { enabled: false, required: false },
    purpose: { enabled: true, required: false },
    prayer: { enabled: false, required: false },
  };

  const fields = customerInfoConfig?.fields || defaultFields;
  const popupEnabled = customerInfoConfig ? customerInfoConfig.popupEnabled : true;

  // Polling logic
  useEffect(() => {
    if (step !== 'payment' || !donationId) return;
    let pollTimer: any;
    let count = 0;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API}/donations/public/status/${donationId}?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.payment_status === 'success') {
            setStep('success');
            setTimeout(() => {
              handleClose();
            }, 5000);
            return;
          }
        }
      } catch (e) {
        console.warn("Status poll error:", e);
      }
      
      count++;
      if (count < 100) {
        pollTimer = setTimeout(checkStatus, 3000);
      }
    };
    
    pollTimer = setTimeout(checkStatus, 3000);
    return () => clearTimeout(pollTimer);
  }, [step, donationId]);

  const handleClose = () => {
    setActiveDonation(null);
    setDonorName("");
    setDonorPhone("");
    setDonorEmail("");
    setDonorAddress("");
    setDonorCity("");
    setDonorState("");
    setDonorPincode("");
    setDonorGotra("");
    setDonorNakshatra("");
    setSpecialPrayer("");
    setStep('form');
    setDonationId(null);
    setUpiString(null);
    setQrCodeUrl("");
  };

  const handleInitiate = async (amt: number, purposeText: string, bypassVal = false) => {
    if (!bypassVal) {
      // Validate required inputs
      const errors: string[] = [];
      if (fields.name.enabled && fields.name.required && !donorName.trim()) errors.push("Full Name is required");
      if (fields.phone.enabled && fields.phone.required && !donorPhone.trim()) errors.push("Phone number is required");
      if (fields.email.enabled && fields.email.required && !donorEmail.trim()) errors.push("Email address is required");
      if (fields.address.enabled && fields.address.required && !donorAddress.trim()) errors.push("Address is required");
      if (fields.city.enabled && fields.city.required && !donorCity.trim()) errors.push("City is required");
      if (fields.state.enabled && fields.state.required && !donorState.trim()) errors.push("State is required");
      if (fields.pincode.enabled && fields.pincode.required && !donorPincode.trim()) errors.push("Pincode is required");
      if (fields.gotra.enabled && fields.gotra.required && !donorGotra.trim()) errors.push("Gotra is required");
      if (fields.nakshatra.enabled && fields.nakshatra.required && !donorNakshatra.trim()) errors.push("Nakshatra is required");
      if (fields.prayer.enabled && fields.prayer.required && !specialPrayer.trim()) errors.push("Prayer request text is required");

      if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
      }
    }

    setLoading(true);
    try {
      const pathParts = window.location.pathname.split('/');
      const deviceId = pathParts[pathParts.indexOf('player') + 1] || pathParts[pathParts.indexOf('editor') + 1] || null;

      const response = await fetch(`${API}/donations/public/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          amount: amt,
          purpose: purposeText,
          donorName: donorName || "Devotee",
          donorPhone: donorPhone || null,
          donorEmail: donorEmail || null,
          donorAddress: donorAddress || null,
          donorCity: donorCity || null,
          donorState: donorState || null,
          donorPincode: donorPincode || null,
          donorGotra: donorGotra || null,
          donorNakshatra: donorNakshatra || null,
          specialPrayer: specialPrayer || null
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to initiate payment');
      }
      
      const data = await response.json();
      setDonationId(data.donationId);
      
      const qrData = data.upiString || `upi://pay?pa=placeholder@upi&pn=Temple&am=${amt}&tr=${data.donationId}`;
      setUpiString(qrData);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`);
      setStep('payment');
    } catch (e: any) {
      alert(e.message || "Could not connect to payment server");
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (!interactive) {
      if (onSelect) onSelect();
      return;
    }

    setActiveDonation({ amount, label });
    if (popupEnabled) {
      setStep('form');
    } else {
      setStep('payment');
      handleInitiate(amount, label, true);
    }
  };

  const simulateSuccess = async () => {
    if (!donationId) return;
    try {
      await fetch(`${API}/donations/public/simulate-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Hover animations mapping
  const hoverClass = (() => {
    switch (config.hoverEffect) {
      case 'scale': return 'hover:scale-[1.04] hover:shadow-lg transition-transform duration-300';
      case 'glow': return 'hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-shadow duration-300';
      case 'bounce': return 'hover:-translate-y-1.5 transition-transform duration-300';
      case 'none': return '';
      default: return 'hover:scale-[1.04] transition-all duration-300';
    }
  })();

  // Click animations mapping
  const clickClass = (() => {
    switch (config.clickAnimation) {
      case 'pop': return 'active:scale-95';
      case 'sink': return 'active:translate-y-0.5';
      case 'none': return '';
      default: return 'active:scale-95';
    }
  })();

  const cardStyle: React.CSSProperties = {
    backgroundColor: config.backgroundColor || undefined,
    borderColor: config.borderColor || undefined,
    borderWidth: config.borderColor ? '1px' : undefined,
    borderRadius: config.cornerRadius !== undefined ? config.cornerRadius : undefined,
    color: config.textColor || undefined,
    fontFamily: config.fontFamily || undefined,
    fontSize: config.fontSize ? `${config.fontSize}px` : undefined,
    backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  if (config.visible === false) return null;

  return (
    <>
      <button
        onClick={handleCardClick}
        className={cn(
          "relative w-full h-full min-h-[140px] flex flex-col items-center justify-between p-5 text-center shadow-md select-none group overflow-hidden border",
          !config.backgroundColor && !config.backgroundUrl ? "bg-gradient-to-br from-slate-900 to-slate-900 border-white/5" : "",
          config.backgroundUrl ? "after:absolute after:inset-0 after:bg-black/55 group-hover:after:bg-black/40 after:transition-all after:z-0" : "",
          config.shadow || "shadow-md shadow-black/10",
          hoverClass,
          clickClass,
          interactive ? "cursor-pointer" : "cursor-default",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-20" : ""
        )}
        style={cardStyle}
      >
        {/* Glow/Gradient overlay */}
        {config.gradient && !config.backgroundUrl && (
          <div className={cn("absolute inset-0 z-0 opacity-80 group-hover:opacity-95 transition-opacity", config.gradient)} />
        )}

        {/* Badge */}
        {config.badge && (
          <div className="absolute top-2.5 right-2.5 z-20 bg-amber-500 text-slate-950 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            {config.badge}
          </div>
        )}

        <div className="relative z-10 w-full h-full flex flex-col justify-between items-center space-y-2">
          {/* Photo / Icon */}
          {config.photoUrl ? (
            <img src={config.photoUrl} alt="" className="h-11 w-11 object-contain rounded-full shadow bg-black/10 border border-white/10 p-0.5 shrink-0" />
          ) : (
            <Coins className="h-6 w-6 text-amber-400 shrink-0" />
          )}

          {/* Label / Description */}
          <div className="flex-1 flex flex-col justify-center">
            <h4 className="font-bold text-sm tracking-wide line-clamp-1">{label}</h4>
            {description && <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5">{description}</p>}
          </div>

          {/* Amount Badge */}
          <span className="text-xl font-black text-amber-300 mt-2">₹{amount}</span>
        </div>
      </button>

      {/* Devotee Payment Dialog Overlay */}
      {activeDonation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-lg animate-fade-in p-6">
          <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden text-left text-white font-sans">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-lg text-slate-100">Daan Offerings</span>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-white text-sm bg-slate-800/50 hover:bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50 transition-colors">
                Cancel
              </button>
            </div>

            {step === 'form' && (
              <div className="space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Selected offering</div>
                  <div className="text-2xl font-black text-slate-100">₹{activeDonation.amount}</div>
                  <div className="text-xs text-slate-400 mt-1">{activeDonation.label}</div>
                </div>

                <div className="space-y-3.5 pt-2 max-h-[300px] overflow-y-auto px-1 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {fields.name.enabled && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                        Full Name {fields.name.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                      />
                    </div>
                  )}

                  {fields.phone.enabled && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                        Phone Number {fields.phone.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                      />
                    </div>
                  )}

                  {fields.email.enabled && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                        Email Address {fields.email.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                      />
                    </div>
                  )}

                  {fields.address.enabled && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                        Address {fields.address.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={donorAddress}
                        onChange={(e) => setDonorAddress(e.target.value)}
                        placeholder="Street address"
                        className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {fields.city.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          City {fields.city.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorCity}
                          onChange={(e) => setDonorCity(e.target.value)}
                          placeholder="City"
                          className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.state.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          State {fields.state.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorState}
                          onChange={(e) => setDonorState(e.target.value)}
                          placeholder="State"
                          className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {fields.pincode.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Pincode {fields.pincode.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorPincode}
                          onChange={(e) => setDonorPincode(e.target.value)}
                          placeholder="Pincode"
                          className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.gotra.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Gotra {fields.gotra.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorGotra}
                          onChange={(e) => setDonorGotra(e.target.value)}
                          placeholder="Gotra / गोत्र"
                          className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {fields.nakshatra.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Nakshatra {fields.nakshatra.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorNakshatra}
                          onChange={(e) => setDonorNakshatra(e.target.value)}
                          placeholder="Nakshatra / नक्षत्र"
                          className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.prayer.enabled && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Special Prayer Message {fields.prayer.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={specialPrayer}
                          onChange={(e) => setSpecialPrayer(e.target.value)}
                          placeholder="Family details, special prayer requests..."
                          className="w-full min-h-[70px] bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  disabled={loading}
                  onClick={() => handleInitiate(activeDonation.amount, activeDonation.label)}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-[#070b18] font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#070b18]" />
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 text-[#070b18]" />
                      <span>Generate Payment QR</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="space-y-1">
                  <div className="text-2xl font-black text-slate-100">₹{activeDonation.amount}</div>
                  <div className="text-xs text-slate-400">{activeDonation.label}</div>
                </div>

                <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-800/10">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-[180px] h-[180px]" />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-slate-500">
                      Loading QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1 px-4">
                  <div className="text-sm font-semibold text-slate-200">Scan QR Code to Pay</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Open BHIM, GPay, PhonePe, Paytm, or any UPI app on your phone and scan the QR code to complete donation.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-full font-medium animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Waiting for payment confirmation...</span>
                </div>

                <button
                  onClick={simulateSuccess}
                  className="text-[9px] text-slate-600 hover:text-slate-400 mt-2 bg-slate-900 border border-slate-800/50 px-2.5 py-1 rounded"
                >
                  [Developer: Simulate Payment Success]
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center text-center py-6 space-y-4">
                <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-inner">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>

                <div className="space-y-2 select-none">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Donation Successful
                  </h3>
                  <div className="text-2xl font-black text-slate-100">₹{activeDonation.amount}</div>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Thank you for your generous offering of <strong>₹{activeDonation.amount}</strong> to the temple devasthanam. May you be blessed with peace and prosperity.
                  </p>
                </div>

                <div className="text-[10px] text-slate-500 pt-4">Returning to layout in 5 seconds...</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Standard Widget Preview ── */
function WidgetPreview({ widget, previewMode = false, customerInfoConfig }: { widget: ContentWidget; previewMode?: boolean; customerInfoConfig?: CustomerInfoConfig }) {
  if (widget.type === 'donation_button' || widget.type === 'circle_button' || widget.type === 'rectangular_button' || widget.type === 'square_button') {
    const config: DonationButtonConfig = {
      id: widget.id,
      amount: widget.buttonAmount || 100,
      label: widget.label || 'Offering',
      description: widget.buttonDescription,
      photoUrl: widget.buttonPhotoUrl,
      photoName: widget.buttonPhotoName,
      backgroundUrl: widget.buttonBackgroundUrl,
      backgroundName: widget.buttonBackgroundName,
      backgroundColor: widget.buttonBgColor,
      borderColor: widget.buttonBorderColor,
      textColor: widget.buttonTextColor,
      fontFamily: widget.buttonFontFamily,
      fontSize: widget.buttonFontSize,
      cornerRadius: widget.buttonCornerRadius,
      gradient: widget.buttonGradient,
      shadow: widget.buttonShadow,
      hoverEffect: widget.buttonHoverEffect,
      clickAnimation: widget.buttonClickAnimation,
      badge: widget.buttonBadge,
      visible: widget.buttonVisible !== false
    };
    return (
      <div className="w-full h-full flex items-center justify-center p-2 bg-transparent">
        <SquareOfferingCard config={config} interactive={previewMode} customerInfoConfig={customerInfoConfig} />
      </div>
    );
  }
  if (widget.type === 'links') {
    return <LinksWidget widget={widget} interactive={previewMode} />;
  }
  if (widget.type === 'donation') {
    return <DonationWidget widget={widget} interactive={previewMode} customerInfoConfig={customerInfoConfig} />;
  }
  if (widget.type === 'slideshow') {
    return <SlideshowPreview widget={widget} />;
  }

  // Determine animation class & custom duration
  const scrollDuration = widget.scrollDuration;

  const animationClass = (() => {
    switch (widget.textAnimation) {
      case 'scroll-left':
        if (hasCustomDuration) return ''; // use inline style instead
        return widget.scrollSpeed === 'slow' ? 'animate-marquee-slow' : widget.scrollSpeed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee';
      case 'scroll-up':
        return hasCustomDuration ? '' : 'animate-marquee-vertical';
      case 'typewriter':
        return 'animate-typewriter overflow-hidden whitespace-nowrap';
      case 'fade':
        return 'animate-pulse-glow';
      case 'blink':
        return 'animate-blink';
      default:
        return '';
    }
  })();

  const customAnimStyle: React.CSSProperties = {};
  if (hasCustomDuration && widget.textAnimation === 'scroll-left') {
    customAnimStyle.animation = `marquee ${scrollDuration}s linear infinite`;
  } else if (hasCustomDuration && widget.textAnimation === 'scroll-up') {
    customAnimStyle.animation = `marquee-vertical ${scrollDuration}s linear infinite`;
  }

  const style: React.CSSProperties = {
    backgroundColor: widget.backgroundColor || 'transparent',
    padding: widget.padding,
    borderRadius: widget.borderRadius,
    opacity: (widget.opacity ?? 100) / 100,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (widget.type === 'text' || widget.type === 'rss') {
    const isScrolling = widget.textAnimation === 'scroll-left' || widget.textAnimation === 'scroll-right';
    const spacer = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
    const textContent = widget.text || 'Text';

    if (isScrolling) {
      const duration = hasCustomDuration ? scrollDuration : widget.scrollSpeed === 'slow' ? 20 : widget.scrollSpeed === 'fast' ? 5 : 10;
      return (
        <div style={{ ...style, overflow: 'hidden' }}>
          <div
            className="whitespace-nowrap flex"
            style={{
              fontSize: widget.fontSize,
              fontWeight: widget.fontWeight || '400',
              color: widget.textColor || '#ffffff',
              animation: `marquee-loop ${duration}s linear infinite`,
            }}
          >
            <span>{textContent}{spacer}</span>
            <span>{textContent}{spacer}</span>
          </div>
        </div>
      );
    }

    return (
      <div style={style}>
        <div className={cn("whitespace-nowrap", animationClass)} style={{
          fontSize: widget.fontSize,
          fontWeight: widget.fontWeight || '400',
          color: widget.textColor || '#ffffff',
          ...customAnimStyle,
        }}>
          {textContent}
        </div>
      </div>
    );
  }

  if (widget.type === 'clock') {
    return (
      <div style={style}>
        <ClockWidget fontSize={widget.fontSize} color={widget.textColor} fontWeight={widget.fontWeight} />
      </div>
    );
  }

  if (widget.type === 'weather') {
    return (
      <div style={style}>
        <div className="text-center" style={{ color: widget.textColor || '#ffffff' }}>
          <div className="text-3xl mb-1">☀️</div>
          <div className="text-lg font-semibold">22°C</div>
          <div className="text-xs opacity-70">Sunny</div>
        </div>
      </div>
    );
  }

  if (widget.type === 'image' || widget.type === 'video') {
    const fit = widget.objectFit || 'cover';
    if (widget.playlistEnabled && (widget.playlistItems?.length ?? 0) > 0) {
      return (
        <div style={style}>
          <PlaylistPlayer items={widget.playlistItems!} fit={fit} fallbackName={widget.mediaName} />
        </div>
      );
    }
    if (widget.type === 'image') {
      return (
        <div style={style} className="relative">
          {widget.mediaUrl ? (
            <img src={widget.mediaUrl} alt="" className="w-full h-full" style={{ objectFit: fit }} />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <div className="text-2xl">🖼️</div>
              <span className="text-xs">{widget.mediaName || 'No image'}</span>
            </div>
          )}
        </div>
      );
    }
    const cropLetterbox = fit === 'cover';
    return (
      <div style={style}>
        {widget.mediaUrl ? (
          <video
            src={widget.mediaUrl}
            className="block w-full h-full"
            style={{
              objectFit: fit,
              transform: cropLetterbox ? 'scale(1.12)' : undefined,
              transformOrigin: 'center',
            }}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <div className="text-2xl">🎬</div>
            <span className="text-xs">{widget.mediaName || 'No video'}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={style} className="flex items-center justify-center text-muted-foreground text-xs">
      Empty
    </div>
  );
}

function ClockWidget({ fontSize, color, fontWeight }: { fontSize?: number; color?: string; fontWeight?: string }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span style={{ fontSize: fontSize || 48, color: color || '#ffffff', fontWeight: fontWeight || '700' }}>
      {time}
    </span>
  );
}

function DonationWidget({ widget, interactive, customerInfoConfig }: { widget: ContentWidget; interactive: boolean; customerInfoConfig?: CustomerInfoConfig }) {
  const buttons = widget.donationButtons || [];
  const [selectedBtnId, setSelectedBtnId] = useState<string | null>(null);
  
  const title = widget.donationTitle || "Offer Your Daan";
  const purpose = widget.donationPurpose || "General Donation";
  const styleType = widget.templateStyle || 'modern';

  // Listen to select-donation-button events in edit mode
  useEffect(() => {
    if (interactive) return;
    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.widgetId === widget.id) {
        setSelectedBtnId(detail.buttonId);
      } else {
        setSelectedBtnId(null);
      }
    };
    window.addEventListener("select-donation-button", handleSelect);
    return () => window.removeEventListener("select-donation-button", handleSelect);
  }, [widget.id, interactive]);

  // Select button callback
  const handleSelectBtn = (btnId: string) => {
    setSelectedBtnId(btnId);
    const event = new CustomEvent("select-donation-button", {
      detail: { widgetId: widget.id, buttonId: btnId }
    });
    window.dispatchEvent(event);
  };

  // Filter visible buttons
  const visibleButtons = buttons.filter(b => b.visible !== false);
  const N = visibleButtons.length;

  // Dynamic columns arrangement
  let gridClass = "grid gap-5 w-full justify-center justify-items-center mt-6 transition-all duration-300";
  if (N === 1) gridClass += " grid-cols-1 max-w-sm";
  else if (N === 2) gridClass += " grid-cols-1 sm:grid-cols-2 max-w-2xl";
  else if (N === 3) gridClass += " grid-cols-1 sm:grid-cols-3 max-w-4xl";
  else if (N === 4) gridClass += " grid-cols-2 max-w-4xl";
  else if (N === 5 || N === 6) gridClass += " grid-cols-2 md:grid-cols-3 max-w-5xl";
  else if (N === 7 || N === 8) gridClass += " grid-cols-3 lg:grid-cols-4 max-w-6xl";
  else gridClass += " grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-7xl";

  // Template container base styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: widget.backgroundColor || undefined,
    padding: widget.padding !== undefined ? widget.padding : 24,
    borderRadius: widget.donationContainerRadius !== undefined ? widget.donationContainerRadius : undefined,
    opacity: (widget.opacity ?? 100) / 100,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  };

  // Modern Template Rendering
  if (styleType === 'modern') {
    return (
      <div 
        style={containerStyle} 
        className={cn(
          "relative select-none text-white font-sans flex flex-col justify-start items-center p-8",
          !widget.backgroundColor ? "bg-[#111029]" : "",
          widget.donationContainerShadow || "shadow-xl border border-white/5"
        )}
      >
        <div className="flex flex-col items-center gap-3 mb-6 text-center max-w-xl shrink-0">
          {widget.templeLogoUrl ? (
            <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-full shadow bg-black/10 border border-white/10 p-0.5" />
          ) : (
            <LayoutGrid className="h-10 w-10 text-amber-400" />
          )}
          <h2 
            className="text-2xl font-extrabold tracking-wide uppercase" 
            style={{ 
              color: widget.donationTitleColor || '#fbbf24', 
              fontSize: widget.donationTitleFontSize ? `${widget.donationTitleFontSize}px` : undefined,
              fontFamily: widget.donationTitleFontFamily || undefined
            }}
          >
            {title}
          </h2>
          {purpose && (
            <p 
              className="text-xs tracking-widest uppercase font-medium" 
              style={{ color: widget.donationSubtitleColor || '#e2e8f0' }}
            >
              {purpose}
            </p>
          )}
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1" />
        </div>

        <div className="flex-1 w-full flex items-center justify-center">
          <div className={gridClass}>
            {visibleButtons.map((btn) => (
              <SquareOfferingCard 
                key={btn.id} 
                config={btn} 
                interactive={interactive}
                isSelected={btn.id === selectedBtnId}
                onSelect={() => handleSelectBtn(btn.id)}
                customerInfoConfig={customerInfoConfig}
              />
            ))}
            {visibleButtons.length === 0 && (
              <div className="text-xs text-white/40 col-span-full py-8">No donation buttons configured</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Traditional Template Rendering
  if (styleType === 'traditional') {
    return (
      <div 
        style={containerStyle} 
        className={cn(
          "relative select-none text-amber-950 font-serif flex flex-col justify-start items-center p-8 border-4 border-double border-amber-600/75",
          !widget.backgroundColor ? "bg-[#fffdf6]" : "",
          widget.donationContainerShadow || "shadow-md"
        )}
      >
        {/* Traditional hanging bell symbols */}
        <div className="absolute top-2 left-4 h-12 w-6 border-l border-amber-600/30 flex flex-col items-center justify-end">
          <div className="h-4 w-4 bg-amber-500 rounded-full border border-amber-600 shadow animate-bounce" />
        </div>
        <div className="absolute top-2 right-4 h-12 w-6 border-l border-amber-600/30 flex flex-col items-center justify-end">
          <div className="h-4 w-4 bg-amber-500 rounded-full border border-amber-600 shadow animate-bounce" />
        </div>

        <div className="flex flex-col items-center gap-2 mb-6 text-center max-w-xl shrink-0">
          {widget.templeLogoUrl ? (
            <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-full shadow bg-[#fffdf6] border border-amber-600/50 p-0.5" />
          ) : (
            <div className="h-12 w-12 rounded-full border-2 border-amber-600 flex items-center justify-center bg-amber-500/10">
              <span className="text-xl font-bold text-amber-700">ॐ</span>
            </div>
          )}
          <h2 
            className="text-2xl font-black tracking-wide" 
            style={{ 
              color: widget.donationTitleColor || '#b91c1c', 
              fontSize: widget.donationTitleFontSize ? `${widget.donationTitleFontSize}px` : undefined,
              fontFamily: widget.donationTitleFontFamily || 'Georgia, serif'
            }}
          >
            {title}
          </h2>
          {purpose && (
            <p 
              className="text-xs tracking-wider uppercase font-bold" 
              style={{ color: widget.donationSubtitleColor || '#c2410c' }}
            >
              {purpose}
            </p>
          )}
          <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mt-1" />
        </div>

        <div className="flex-1 w-full flex items-center justify-center">
          <div className={gridClass}>
            {visibleButtons.map((btn) => {
              // Enhance configuration with default traditional themes if overrides not present
              const tradConfig: DonationButtonConfig = {
                ...btn,
                backgroundColor: btn.backgroundColor || 'rgba(185, 28, 28, 0.04)',
                borderColor: btn.borderColor || 'rgba(185, 28, 28, 0.25)',
                textColor: btn.textColor || '#451a03',
                cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : 6,
                hoverEffect: btn.hoverEffect || 'scale',
                shadow: btn.shadow || 'shadow-sm',
              };
              return (
                <SquareOfferingCard 
                  key={btn.id} 
                  config={tradConfig} 
                  interactive={interactive}
                  isSelected={btn.id === selectedBtnId}
                  onSelect={() => handleSelectBtn(btn.id)}
                  customerInfoConfig={customerInfoConfig}
                />
              );
            })}
            {visibleButtons.length === 0 && (
              <div className="text-xs text-amber-900/40 col-span-full py-8">No offerings configured</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Glassmorphism Template Rendering
  return (
    <div 
      style={containerStyle} 
      className={cn(
        "relative select-none text-white font-sans flex flex-col justify-start items-center p-8 border border-white/10 backdrop-blur-md",
        !widget.backgroundColor ? "bg-slate-950/40" : "",
        widget.donationContainerShadow || "shadow-2xl"
      )}
    >
      <div className="flex flex-col items-center gap-3 mb-6 text-center max-w-xl shrink-0">
        {widget.templeLogoUrl ? (
          <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-full shadow bg-white/5 border border-white/20 p-0.5" />
        ) : (
          <div className="h-12 w-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur">
            <Sparkles className="h-6 w-6 text-sky-400" />
          </div>
        )}
        <h2 
          className="text-2xl font-black tracking-widest uppercase bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent" 
          style={{ 
            fontSize: widget.donationTitleFontSize ? `${widget.donationTitleFontSize}px` : undefined,
            fontFamily: widget.donationTitleFontFamily || undefined
          }}
        >
          {title}
        </h2>
        {purpose && (
          <p 
            className="text-xs tracking-widest uppercase font-semibold text-slate-400" 
            style={{ color: widget.donationSubtitleColor || undefined }}
          >
            {purpose}
          </p>
        )}
        <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent mt-1" />
      </div>

      <div className="flex-1 w-full flex items-center justify-center">
        <div className={gridClass}>
          {visibleButtons.map((btn) => {
            const glassConfig: DonationButtonConfig = {
              ...btn,
              backgroundColor: btn.backgroundColor || 'rgba(255, 255, 255, 0.06)',
              borderColor: btn.borderColor || 'rgba(255, 255, 255, 0.15)',
              textColor: btn.textColor || '#f8fafc',
              cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : 20,
              hoverEffect: btn.hoverEffect || 'glow',
              shadow: btn.shadow || 'shadow-lg shadow-black/10',
            };
            return (
              <SquareOfferingCard 
                key={btn.id} 
                config={glassConfig} 
                interactive={interactive}
                isSelected={btn.id === selectedBtnId}
                onSelect={() => handleSelectBtn(btn.id)}
                customerInfoConfig={customerInfoConfig}
              />
            );
          })}
          {visibleButtons.length === 0 && (
            <div className="text-xs text-white/30 col-span-full py-8">No donation buttons configured</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Playlist Player (image + video, with optional time/day scheduling) ── */
function parseHM(s?: string): number | null {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function isItemActive(item: PlaylistItem, now: Date): boolean {
  if (!item.scheduleEnabled) return true;
  const days = item.daysOfWeek;
  if (days && days.length && !days.includes(now.getDay())) return false;
  const start = parseHM(item.startTime);
  const end = parseHM(item.endTime);
  if (start == null && end == null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = start ?? 0;
  const e = end ?? 24 * 60;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

function PlaylistPlayer({
  items,
  fit,
  fallbackName,
}: {
  items: PlaylistItem[];
  fit: 'cover' | 'contain' | 'fill';
  fallbackName?: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const now = new Date();
  const active = items.filter((it) => it.mediaUrl && isItemActive(it, now));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (active.length === 0) return;
    if (idx >= active.length) setIdx(0);
  }, [active.length, idx, tick]);

  const current = active[idx % Math.max(active.length, 1)];

  useEffect(() => {
    if (!current) return;
    if (current.mediaType === 'video' && (!current.duration || current.duration === 0)) return;
    const ms = Math.max(1, current.duration || 8) * 1000;
    const t = setTimeout(() => {
      setIdx((p) => (active.length ? (p + 1) % active.length : 0));
    }, ms);
    return () => clearTimeout(t);
  }, [current?.id, current?.duration, current?.mediaType, active.length]);

  if (active.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <div className="text-2xl">🕒</div>
        <span className="text-xs">
          {items.length === 0 ? (fallbackName || 'No playlist items') : 'No item scheduled for now'}
        </span>
      </div>
    );
  }

  if (!current) return null;

  if (current.mediaType === 'image') {
    return (
      <img
        key={current.id}
        src={current.mediaUrl}
        alt={current.mediaName}
        className="w-full h-full"
        style={{ objectFit: fit }}
      />
    );
  }

  return (
    <video
      key={current.id}
      src={current.mediaUrl}
      className="block w-full h-full"
      style={{ objectFit: fit }}
      autoPlay
      muted
      playsInline
      loop={active.length === 1 && (!current.duration || current.duration === 0)}
      onEnded={() => {
        if (!current.duration || current.duration === 0) {
          setIdx((p) => (active.length ? (p + 1) % active.length : 0));
        }
      }}
    />
  );
}



/* ── Zone Renderer ── */
export function ZoneRenderer({ zone, onUpdate, onSelectZone, selectedZoneId, depth = 0, previewMode = false, customerInfoConfig }: ZoneRendererProps) {
  const isSelected = zone.id === selectedZoneId;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const widgetType = e.dataTransfer.getData('widget-type') as ContentWidgetType;
    const templateStyle = e.dataTransfer.getData('template-style') || undefined;
    if (widgetType && zone.split === 'none') {
      const widget = createWidget(widgetType, templateStyle);
      onUpdate({ ...zone, content: widget });
    }
  }, [zone, onUpdate]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (zone.split === 'none') setIsDragOver(true);
  }, [zone.split]);

  const handleSplit = (direction: 'horizontal' | 'vertical') => {
    onUpdate(splitZone(zone, direction));
  };

  const handleDelete = () => {
    onUpdate({ ...zone, content: null, split: 'none', children: null });
  };

  if (zone.split !== 'none' && zone.children) {
    const isH = zone.split === 'horizontal';
    return (
      <div className={cn("flex w-full h-full overflow-hidden", isH ? "flex-row" : "flex-col")} style={previewMode ? undefined : { gap: 2 }}>
        <div className="min-w-0 min-h-0 overflow-hidden" style={{ [isH ? 'width' : 'height']: `${zone.splitRatio}%`, [isH ? 'height' : 'width']: '100%' }}>
          <ZoneRenderer
            zone={zone.children[0]}
            onUpdate={(updated) => {
              const newChildren: [ScreenZone, ScreenZone] = [updated, zone.children![1]];
              onUpdate({ ...zone, children: newChildren });
            }}
            onSelectZone={onSelectZone}
            selectedZoneId={selectedZoneId}
            depth={depth + 1}
            previewMode={previewMode}
            customerInfoConfig={customerInfoConfig}
          />
        </div>
        {!previewMode && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center cursor-col-resize bg-border/60 hover:bg-primary/40 transition-colors z-10",
              isH ? "w-1.5 h-full" : "h-1.5 w-full cursor-row-resize"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              const parent = (e.target as HTMLElement).parentElement!;
              const rect = parent.getBoundingClientRect();
              const handleMove = (me: MouseEvent) => {
                const ratio = isH
                  ? ((me.clientX - rect.left) / rect.width) * 100
                  : ((me.clientY - rect.top) / rect.height) * 100;
                onUpdate({ ...zone, splitRatio: Math.max(10, Math.min(90, ratio)) });
              };
              const handleUp = () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
              };
              window.addEventListener('mousemove', handleMove);
              window.addEventListener('mouseup', handleUp);
            }}
          >
            <GripVertical className={cn("h-3 w-3 text-muted-foreground", !isH && "rotate-90")} />
          </div>
        )}
        <div className="min-w-0 min-h-0 overflow-hidden" style={{ [isH ? 'width' : 'height']: `${100 - zone.splitRatio}%`, [isH ? 'height' : 'width']: '100%' }}>
          <ZoneRenderer
            zone={zone.children[1]}
            onUpdate={(updated) => {
              const newChildren: [ScreenZone, ScreenZone] = [zone.children![0], updated];
              onUpdate({ ...zone, children: newChildren });
            }}
            onSelectZone={onSelectZone}
            selectedZoneId={selectedZoneId}
            depth={depth + 1}
            previewMode={previewMode}
            customerInfoConfig={customerInfoConfig}
          />
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="relative w-full h-full">
        {zone.content ? <WidgetPreview widget={zone.content} previewMode customerInfoConfig={customerInfoConfig} /> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full h-full transition-all duration-150 group/zone",
        isDragOver && "ring-2 ring-primary ring-inset",
        isSelected && "ring-2 ring-primary ring-inset",
        !zone.content && "border border-dashed border-border/60"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
    >
      {zone.content ? (
        <WidgetPreview widget={zone.content} customerInfoConfig={customerInfoConfig} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
          <p className="text-xs">Drop content here</p>
        </div>
      )}

      <div className={cn(
        "absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity z-20",
        (isSelected || isDragOver) && "opacity-100",
        "group-hover/zone:opacity-100"
      )}>
        <Button variant="secondary" size="icon" className="h-6 w-6 bg-card/90 backdrop-blur-sm hover:bg-card"
          onClick={(e) => { e.stopPropagation(); handleSplit('horizontal'); }} title="Split Horizontally">
          <SplitSquareHorizontal className="h-3 w-3" />
        </Button>
        <Button variant="secondary" size="icon" className="h-6 w-6 bg-card/90 backdrop-blur-sm hover:bg-card"
          onClick={(e) => { e.stopPropagation(); handleSplit('vertical'); }} title="Split Vertically">
          <SplitSquareVertical className="h-3 w-3" />
        </Button>
        {zone.content && (
          <Button variant="secondary" size="icon"
            className="h-6 w-6 bg-card/90 backdrop-blur-sm hover:bg-destructive/90 hover:text-destructive-foreground"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }} title="Clear">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
