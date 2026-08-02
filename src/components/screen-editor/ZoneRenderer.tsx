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

/* ── Individual Offering Donation Button ── */
function IndividualDonationButton({ widget, interactive }: { widget: ContentWidget; interactive: boolean }) {
  const [activeDonation, setActiveDonation] = useState<any>(null);
  
  // Form states
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  // Payment states
  const [donationId, setDonationId] = useState<string | null>(null);
  const [upiString, setUpiString] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  
  const amount = widget.buttonAmount || 100;
  const description = widget.buttonDescription || "Offering";
  const type = widget.type;

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
          if (data.status === 'success') {
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
    setStep('form');
    setDonationId(null);
    setUpiString(null);
    setQrCodeUrl("");
  };

  const handleInitiate = async (amt: number, purposeText: string) => {
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
          donorPhone: donorPhone || "",
          donorEmail: donorEmail || ""
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

  // Determine premium default backgrounds & classes
  let shapeClass = "";
  let defaultBgClass = "";
  let innerElements = null;
  const customContainerStyle: React.CSSProperties = {
    padding: widget.padding || 0,
    borderRadius: widget.borderRadius,
    opacity: (widget.opacity ?? 100) / 100,
    pointerEvents: interactive ? 'auto' : 'none',
  };

  const hasCustomBgColor = widget.backgroundColor && widget.backgroundColor !== 'transparent';
  const hasBgImage = !!widget.buttonBackgroundUrl;

  if (hasBgImage) {
    customContainerStyle.backgroundImage = `url(${widget.buttonBackgroundUrl})`;
    customContainerStyle.backgroundSize = 'cover';
    customContainerStyle.backgroundPosition = 'center';
  } else if (hasCustomBgColor) {
    customContainerStyle.backgroundColor = widget.backgroundColor;
  }

  if (type === 'circle_button') {
    shapeClass = "rounded-full aspect-square w-[80%] max-w-[240px] flex flex-col justify-center items-center border-2 border-yellow-300/70 shadow-[0_0_25px_rgba(249,115,22,0.45)] overflow-hidden";
    if (!hasBgImage && !hasCustomBgColor) {
      defaultBgClass = "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600";
    }
    innerElements = (
      <div className="relative z-10 flex flex-col items-center text-center justify-center w-full h-full space-y-1.5 p-3 rounded-full border border-yellow-400/20 m-1 bg-black/15">
        {widget.buttonPhotoUrl ? (
          <img src={widget.buttonPhotoUrl} alt="Icon" className="h-10 w-10 object-contain rounded-full border border-yellow-500/50 p-0.5 bg-black/20" />
        ) : (
          <Coins className="h-6 w-6 text-yellow-300 animate-pulse" />
        )}
        <span className="text-2xl font-black tracking-wide text-yellow-300 drop-shadow-md">₹{amount}</span>
        <span className="text-[10px] font-bold tracking-wider uppercase drop-shadow text-slate-100 max-w-full truncate px-2">{description}</span>
      </div>
    );
  } else if (type === 'rectangular_button') {
    shapeClass = "rounded-2xl w-full h-[85%] flex flex-col justify-center items-center border border-yellow-500/40 shadow-xl shadow-red-950/25 overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-gradient-to-b before:from-yellow-400 before:to-amber-600 before:z-10";
    if (!hasBgImage && !hasCustomBgColor) {
      defaultBgClass = "bg-gradient-to-r from-red-950 via-rose-900 to-red-950";
    }
    innerElements = (
      <div className="relative z-10 flex flex-row items-center justify-between w-full h-full px-6 gap-3 py-4 bg-black/20">
        <div className="flex items-center gap-3">
          {widget.buttonPhotoUrl ? (
            <img src={widget.buttonPhotoUrl} alt="Icon" className="h-12 w-12 shrink-0 object-contain rounded-full border border-yellow-500/50 p-0.5 bg-black/20" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Coins className="h-5 w-5 text-yellow-400" />
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold tracking-wider text-yellow-100 uppercase drop-shadow">{description}</span>
            <span className="text-[9px] text-amber-200/50 uppercase tracking-widest font-semibold">Devasthanam Offering</span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">₹{amount}</span>
          <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold mt-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Tap to Pay</span>
        </div>
      </div>
    );
  } else if (type === 'square_button') {
    shapeClass = "rounded-none aspect-square w-[80%] max-w-[240px] flex flex-col justify-center items-center border-2 border-yellow-400/60 shadow-[0_0_20px_rgba(234,179,8,0.25)] overflow-hidden after:absolute after:inset-1.5 after:border after:border-yellow-300/30 after:pointer-events-none";
    if (!hasBgImage && !hasCustomBgColor) {
      defaultBgClass = "bg-gradient-to-br from-yellow-600 via-amber-600 to-yellow-800";
    }
    innerElements = (
      <div className="relative z-10 flex flex-col items-center text-center justify-between w-full h-full py-5 px-3 bg-black/20">
        <span className="text-[11px] font-bold tracking-wider uppercase text-yellow-100/90 drop-shadow-sm max-w-full truncate px-1">{description}</span>
        {widget.buttonPhotoUrl ? (
          <img src={widget.buttonPhotoUrl} alt="Icon" className="h-12 w-12 object-contain rounded-lg border border-yellow-500/40 p-0.5 bg-black/20" />
        ) : (
          <Sparkles className="h-8 w-8 text-yellow-300 opacity-80" />
        )}
        <span className="text-3xl font-black tracking-wide text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">₹{amount}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-transparent select-none p-2">
      <button
        onClick={() => interactive && setActiveDonation({ amount, label: description })}
        className={cn(
          "relative border shadow-lg transition-all duration-300 overflow-hidden text-white group",
          defaultBgClass,
          interactive ? "cursor-pointer hover:scale-[1.04] hover:shadow-yellow-950/30" : "cursor-default",
          widget.buttonBackgroundUrl ? "after:absolute after:inset-0 after:bg-black/40 group-hover:after:bg-black/25 after:transition-all after:z-0" : "",
          shapeClass
        )}
        style={customContainerStyle}
      >
        {innerElements}
      </button>

      {/* Reused Payment Dialog Overlay */}
      {activeDonation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-lg animate-fade-in p-6">
          <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden text-left">
            {/* Background glowing gradients */}
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

                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Devotee Name (Optional)</label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                    />
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
    </div>
  );
}

/* ── Standard Widget Preview ── */
function WidgetPreview({ widget, previewMode = false }: { widget: ContentWidget; previewMode?: boolean }) {
  if (widget.type === 'circle_button' || widget.type === 'rectangular_button' || widget.type === 'square_button') {
    return <IndividualDonationButton widget={widget} interactive={previewMode} />;
  }
  if (widget.type === 'links') {
    return <LinksWidget widget={widget} interactive={previewMode} />;
  }
  if (widget.type === 'donation') {
    return <DonationWidget widget={widget} interactive={previewMode} />;
  }
  if (widget.type === 'slideshow') {
    return <SlideshowPreview widget={widget} />;
  }

  // Determine animation class & custom duration
  const scrollDuration = widget.scrollDuration;
  const hasCustomDuration = scrollDuration && scrollDuration > 0;

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

function DonationWidget({ widget, interactive }: { widget: ContentWidget; interactive: boolean }) {
  const buttons = widget.donationButtons || [];
  const [activeDonation, setActiveDonation] = useState<any>(null);
  
  // Form states
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  // Payment states
  const [donationId, setDonationId] = useState<string | null>(null);
  const [upiString, setUpiString] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  
  const title = widget.donationTitle || "Offer Your Daan";
  const purpose = widget.donationPurpose || "General Donation";
  
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
          if (data.status === 'success') {
            setStep('success');
            // Auto close after 5 seconds
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
      if (count < 100) { // Poll for ~5 minutes max
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
    setStep('form');
    setDonationId(null);
    setUpiString(null);
    setQrCodeUrl("");
  };

  const handleInitiate = async (amount: number, purposeText: string) => {
    setLoading(true);
    try {
      const pathParts = window.location.pathname.split('/');
      const deviceId = pathParts[pathParts.indexOf('player') + 1] || pathParts[pathParts.indexOf('editor') + 1] || null;

      const response = await fetch(`${API}/donations/public/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          amount,
          purpose: purposeText,
          donorName: donorName || "Devotee",
          donorPhone: donorPhone || "",
          donorEmail: donorEmail || ""
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to initiate payment');
      }
      
      const data = await response.json();
      setDonationId(data.donationId);
      
      const qrData = data.upiString || `upi://pay?pa=placeholder@upi&pn=Temple&am=${amount}&tr=${data.donationId}`;
      setUpiString(qrData);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`);
      setStep('payment');
    } catch (e: any) {
      alert(e.message || "Could not connect to payment server");
    } finally {
      setLoading(false);
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

  const orientation = widget.donationOrientation || 'grid';
  const shape = widget.donationStyle || 'rounded';
  
  let gridClass = "grid grid-cols-2 gap-4 w-full";
  if (orientation === 'horizontal') gridClass = "flex flex-row gap-4 justify-center items-center w-full";
  if (orientation === 'vertical') gridClass = "flex flex-col gap-4 justify-center items-center w-full";

  let shapeClass = "rounded-lg";
  if (shape === 'circle') shapeClass = "rounded-full aspect-square flex flex-col justify-center items-center h-28 w-28";
  if (shape === 'square') shapeClass = "rounded-none aspect-square flex flex-col justify-center items-center h-28 w-28";
  if (shape === 'rounded') shapeClass = "rounded-xl flex flex-col justify-center items-center py-4 px-6";

  const style: React.CSSProperties = {
    backgroundColor: widget.backgroundColor || 'transparent',
    padding: widget.padding || 16,
    borderRadius: widget.borderRadius || 12,
    opacity: (widget.opacity ?? 100) / 100,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <div style={style} className="relative select-none text-white font-sans">
      <div className="flex flex-col items-center gap-2 mb-6 text-center max-w-md">
        <HeartHandshake className="h-10 w-10 text-emerald-400 animate-pulse" />
        <h2 className="text-xl font-bold tracking-wide" style={{ fontSize: widget.fontSize ? widget.fontSize * 0.8 : 22 }}>
          {title}
        </h2>
        <p className="text-xs text-white/60 tracking-wider uppercase font-medium">{purpose}</p>
      </div>

      <div className={gridClass}>
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => interactive && setActiveDonation(btn)}
            className={cn(
              "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-500/30 text-white font-semibold shadow-lg shadow-emerald-950/10 hover:shadow-emerald-950/30 hover:scale-[1.04] transition-all duration-300",
              shapeClass
            )}
          >
            <span className="text-lg font-bold">₹{btn.amount}</span>
            <span className="text-[10px] opacity-70 mt-1 uppercase font-medium tracking-wider truncate max-w-full px-2">{btn.label}</span>
          </button>
        ))}
        {buttons.length === 0 && (
          <div className="text-xs text-white/40">No donation buttons configured</div>
        )}
      </div>

      {/* Interactive Devotee Payment Dialog Overlay */}
      {activeDonation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-lg animate-fade-in p-6">
          <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden">
            {/* Background glowing gradients */}
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

                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Devotee Name (Optional)</label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full h-11 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                    />
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

                {/* Simulated Success helper for testing locally */}
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
export function ZoneRenderer({ zone, onUpdate, onSelectZone, selectedZoneId, depth = 0, previewMode = false }: ZoneRendererProps) {
  const isSelected = zone.id === selectedZoneId;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const widgetType = e.dataTransfer.getData('widget-type') as ContentWidgetType;
    if (widgetType && zone.split === 'none') {
      const widget = createWidget(widgetType);
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
          />
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="relative w-full h-full">
        {zone.content ? <WidgetPreview widget={zone.content} previewMode /> : null}
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
        <WidgetPreview widget={zone.content} />
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
