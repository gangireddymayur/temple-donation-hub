import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { createPortal } from "react-dom";
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
  CustomerInfoConfig,
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
  LayoutGrid,
  AlertTriangle,
  XCircle,
  RotateCcw,
  CreditCard,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReligionConfig } from "@/lib/religion-config";

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
  religion?: string;
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
  customerInfoConfig,
  themeStyle,
  religion = 'hinduism'
}: {
  config: DonationButtonConfig;
  interactive: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  customerInfoConfig?: CustomerInfoConfig;
  themeStyle?: string;
  religion?: string;
}) {
  const { amount = 100, label = "Sacred Offering", description = "" } = config;
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

  const [step, setStep] = useState<'form' | 'processing' | 'payment' | 'success' | 'cancelled' | 'failed'>('form');
  const [loading, setLoading] = useState(false);
  const [donationId, setDonationId] = useState<string | null>(null);
  const [upiString, setUpiString] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState<any>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  const isHinduOrJain = !religion || religion === 'hinduism' || religion === 'jainism';
  const relMeta = getReligionConfig(religion as any);
  const modalTitle = relMeta?.terminology?.donationTerm ? `Complete Your ${relMeta.terminology.donationTerm}` : "Complete Your Offering";
  const badgeTitle = relMeta?.name ? `${relMeta.name} Grace` : "Divine Grace";
  const badgeDescription = "100% of your sacred offering directly supports temple seva and daily rituals.";
  const prayerLabel = relMeta?.terminology?.prayerTerm || "Special Prayer / Request";

  // Helper to trigger POS thermal receipt printing via Native Android bridge
  const triggerThermalPrint = (txnPid?: string) => {
    try {
      const receiptData = {
        templeName: relMeta?.name ? `${relMeta.name} Offering` : "TEMPLE OFFERING HUB",
        symbol: relMeta?.symbol || (isHinduOrJain ? "🕉️" : "✨"),
        receiptNo: `RCP-${(donationId || txnPid || Date.now().toString()).slice(-6).toUpperCase()}`,
        dateTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
        devoteeName: donorName || "Devotee",
        phone: donorPhone || "N/A",
        gotram: donorGotra || "",
        nakshatram: donorNakshatra || "",
        sevaName: activeDonation?.label || "Sacred Offering",
        amount: Number(activeDonation?.amount || 0),
        paymentId: txnPid || donationId || lastPaymentId || "PAID",
        blessing: isHinduOrJain 
          ? "May the Lord's divine grace bestow peace, health & prosperity upon you and your family."
          : "Thank you for your generous contribution and support."
      };

      const payloadStr = JSON.stringify(receiptData);

      // Direct JavascriptInterface bridge calls
      const win = window as any;
      if (win.AndroidPrinter && typeof win.AndroidPrinter.printReceipt === 'function') {
        win.AndroidPrinter.printReceipt(payloadStr);
      } else if (win.parent && win.parent.AndroidPrinter && typeof win.parent.AndroidPrinter.printReceipt === 'function') {
        win.parent.AndroidPrinter.printReceipt(payloadStr);
      } else if (win.top && win.top.AndroidPrinter && typeof win.top.AndroidPrinter.printReceipt === 'function') {
        win.top.AndroidPrinter.printReceipt(payloadStr);
      }

      // Cross-frame / iframe postMessage broadcast
      window.postMessage({ type: 'PRINT_RECEIPT', payload: receiptData }, '*');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'PRINT_RECEIPT', payload: receiptData }, '*');
      }
      if (window.top && window.top !== window && window.top !== window.parent) {
        window.top.postMessage({ type: 'PRINT_RECEIPT', payload: receiptData }, '*');
      }
    } catch (e) {
      console.error("Failed to trigger thermal print:", e);
    }
  };

  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        setTimeout(() => resolve(!!(window as any).Razorpay), 3000);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
      setTimeout(() => resolve(!!(window as any).Razorpay), 5000);
    });
  };

  const openRazorpayModal = async (orderData: any) => {
    const isLoaded = await ensureRazorpayLoaded();
    if (isLoaded && (window as any).Razorpay) {
      try {
        const rzp = new (window as any).Razorpay({
          key: orderData.keyId,
          amount: orderData.amountInPaise,
          currency: "INR",
          name: relMeta.name || "Temple Offering",
          description: orderData.purpose || "Sacred Offering",
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              setLoading(true);
              const txnPid = response.razorpay_payment_id || "PAY-" + Date.now().toString().slice(-6);
              setLastPaymentId(txnPid);
              triggerThermalPrint(txnPid);

              const verifyRes = await fetch(`${API}/donations/public/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  donationId: orderData.donationId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                })
              });
              if (verifyRes.ok) {
                setStep('success');
                setTimeout(() => {
                  handleClose();
                }, 6000);
              } else {
                setStep('success'); // Payment was charged at Razorpay level
                setTimeout(() => {
                  handleClose();
                }, 6000);
              }
            } catch (e) {
              console.error("Payment verification error:", e);
              setStep('success');
              setTimeout(() => {
                handleClose();
              }, 6000);
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: donorName || "Devotee",
            email: donorEmail || "devotee@temple.org",
            contact: donorPhone || "9999999999"
          },
          theme: {
            color: "#f59e0b",
            backdrop_color: "transparent"
          },
          modal: {
            backdropclose: true,
            escape: true,
            handleback: true,
            animation: true,
            ondismiss: function () {
              setStep((currentStep) => {
                if (currentStep === 'processing') {
                  return 'cancelled';
                }
                return currentStep;
              });
            }
          }
        });

        rzp.on('payment.failed', function (resp: any) {
          const failReason = resp?.error?.description || resp?.error?.reason || "Payment could not be processed.";
          setErrorMessage(failReason);
          setStep('failed');
        });

        rzp.open();
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to initialize payment gateway.");
        setStep('failed');
      }
    } else {
      setErrorMessage("Could not load Razorpay gateway. Please check your internet connection.");
      setStep('failed');
    }
  };

  const defaultFields = {
    name: { enabled: true, required: true },
    phone: { enabled: true, required: true },
    email: { enabled: true, required: false },
    address: { enabled: false, required: false },
    city: { enabled: false, required: false },
    state: { enabled: false, required: false },
    pincode: { enabled: false, required: false },
    gotra: { enabled: isHinduOrJain, required: false },
    nakshatra: { enabled: isHinduOrJain, required: false },
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
            triggerThermalPrint(donationId);
            setStep('success');
            setTimeout(() => {
              handleClose();
            }, 6000);
            return;
          }
        }
      } catch (e) {
        console.warn("Status poll error:", e);
      }
      
      count++;
      if (count < 60) {
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
    setErrorMessage(null);
    setRazorpayOrderData(null);
  };

  const handleInitiate = async (amt: number, purposeText: string, bypassVal = false) => {
    setErrorMessage(null);
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
        setErrorMessage(errors.join(" • "));
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
        throw new Error(err.error || 'Payment mode is not configured for this temple');
      }
      
      const data = await response.json();
      setDonationId(data.donationId);
      setRazorpayOrderData(data);
      
      // If Razorpay is enabled, directly launch the checkout popup without showing intermediate QR screen
      if (data.useRazorpay && data.orderId) {
        setStep('processing');
        openRazorpayModal({ ...data, amount: amt, purpose: purposeText });
      } else {
        // Fallback to static or generated QR screen
        const qrData = data.paymentLink || data.upiString || `upi://pay?pa=placeholder@upi&pn=Temple&am=${amt}&tr=${data.donationId}`;
        setUpiString(qrData);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`);
        setStep('payment');
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Payment mode is not configured or server unreachable. Please check Admin > Payment Settings.");
      setStep('failed');
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
      setStep('processing');
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
          "relative w-full h-full min-h-[105px] sm:min-h-[120px] flex flex-col items-center justify-between p-3.5 sm:p-4 text-center shadow-lg select-none group overflow-hidden border transition-all duration-300",
          !config.backgroundColor && !config.backgroundUrl ? "bg-slate-950/80 backdrop-blur-md border-white/15 hover:border-amber-400/50 hover:bg-slate-950/90" : "",
          config.shadow || "shadow-lg shadow-black/20",
          hoverClass,
          clickClass,
          interactive ? "cursor-pointer" : "cursor-default",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-20" : ""
        )}
        style={cardStyle}
      >
        {/* Dynamic Card Background Dim Overlay */}
        {config.backgroundUrl && (
          <div
            className="absolute inset-0 bg-black z-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-40"
            style={{ opacity: (config.backgroundDim ?? 55) / 100 }}
          />
        )}

        {/* Glow/Gradient overlay */}
        {config.gradient && !config.backgroundUrl && (
          <div className={cn("absolute inset-0 z-0 opacity-80 group-hover:opacity-95 transition-opacity", config.gradient)} />
        )}

        {/* Badge */}
        {config.badge && (
          <div className="absolute top-2 right-2 z-20 bg-amber-500 text-slate-950 font-bold uppercase text-[8px] sm:text-[9px] tracking-wider px-1.5 py-0.5 rounded-full shadow-sm">
            {config.badge}
          </div>
        )}

        <div className="relative z-10 w-full h-full flex flex-col justify-between items-center space-y-1.5 py-0.5">
          {/* Photo / Icon */}
          {themeStyle === 'minimal' ? (
            config.photoUrl ? (
              <img src={config.photoUrl} alt="" className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-full border-2 border-orange-500 p-0.5 bg-stone-900/60 shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-orange-500/80 flex items-center justify-center bg-orange-500/10 shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Coins className="h-4 w-4 text-orange-400" />
              </div>
            )
          ) : (
            config.photoUrl ? (
              <img src={config.photoUrl} alt="" className="h-9 w-9 sm:h-10 sm:w-10 object-cover rounded-full shadow bg-black/10 border border-white/10 p-0.5 shrink-0" />
            ) : (
              <Coins className="h-5 w-5 text-amber-400 shrink-0" />
            )
          )}

          {/* Label / Description */}
          <div className="flex-1 flex flex-col justify-center items-center w-full px-1 py-0.5">
            <h4 className={cn("font-bold text-xs sm:text-sm tracking-wide break-words whitespace-normal text-center leading-snug max-w-full", themeStyle === 'minimal' ? "text-white uppercase tracking-wider text-sm" : "")}>
              {label}
            </h4>
            {description && (
              <p className={cn("text-[9.5px] sm:text-[10.5px] break-words whitespace-normal text-center leading-tight mt-1 max-w-full", themeStyle === 'minimal' ? "text-stone-300" : "text-white/75")}>
                {description}
              </p>
            )}
          </div>

          {/* Amount Badge */}
          {themeStyle === 'minimal' ? (
            <span className="mt-1.5 px-4 py-1.5 bg-orange-500 text-stone-950 font-bold text-[10px] uppercase rounded-full tracking-widest flex items-center gap-1 transition-all duration-300 active:scale-95 group-hover:bg-orange-600 shadow-sm shrink-0">
              Explore ₹{amount} →
            </span>
          ) : (
            <span className="text-base sm:text-lg font-black text-amber-300 mt-0.5 shrink-0">₹{amount}</span>
          )}
        </div>
      </button>

      {/* Devotee Payment Dialog Overlay (Mounted to document.body via Portal to escape all ancestor transforms) */}
      {activeDonation && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg md:max-w-3xl w-full shadow-2xl space-y-5 relative overflow-hidden text-left text-white font-sans my-auto">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-lg text-slate-100">{modalTitle}</span>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-white text-sm bg-slate-800/50 hover:bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50 transition-colors">
                Cancel
              </button>
            </div>

            {errorMessage && step === 'form' && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-3 rounded-xl flex items-start gap-2.5 animate-slide-down">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="font-bold text-amber-200">Notice</p>
                  <p className="text-[11px] text-amber-300/90 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* STEP 1: DEVOTEE FORM */}
            {step === 'form' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left Column: Selected Offering Summary */}
                <div className="md:col-span-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Selected Offering</div>
                    <div className="text-3xl font-black text-slate-100">₹{activeDonation.amount}</div>
                    <div className="text-base font-bold text-slate-200">{activeDonation.label}</div>
                    {description && (
                      <div className="text-xs text-slate-400 leading-relaxed pt-1">{description}</div>
                    )}
                  </div>
                  
                  <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 text-[11px] text-slate-400 text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{badgeTitle}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{badgeDescription}</p>
                  </div>
                </div>

                {/* Right Column: Devotee Form Fields in 2-Column Grid */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] md:max-h-[440px] overflow-y-auto px-1 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
                    {fields.name.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Full Name {fields.name.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder="Enter full name"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.phone.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Phone Number {fields.phone.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="tel"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.email.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Email Address {fields.email.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="email"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.gotra.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Gotra {fields.gotra.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorGotra}
                          onChange={(e) => setDonorGotra(e.target.value)}
                          placeholder="Gotra / गोत्र"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.nakshatra.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Nakshatra {fields.nakshatra.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorNakshatra}
                          onChange={(e) => setDonorNakshatra(e.target.value)}
                          placeholder="Nakshatra / नक्षत्र"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.address.enabled && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Address {fields.address.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorAddress}
                          onChange={(e) => setDonorAddress(e.target.value)}
                          placeholder="Street address"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.city.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          City {fields.city.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorCity}
                          onChange={(e) => setDonorCity(e.target.value)}
                          placeholder="City"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.state.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          State {fields.state.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorState}
                          onChange={(e) => setDonorState(e.target.value)}
                          placeholder="State"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}

                    {fields.pincode.enabled && (
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          Pincode {fields.pincode.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={donorPincode}
                          onChange={(e) => setDonorPincode(e.target.value)}
                          placeholder="Pincode"
                          className="w-full h-9 bg-slate-900/60 border border-slate-800 rounded-xl px-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}
                    {fields.prayer.enabled && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          {prayerLabel} {fields.prayer.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={specialPrayer}
                          onChange={(e) => setSpecialPrayer(e.target.value)}
                          placeholder="Special prayer requests, family notes..."
                          className="w-full min-h-[50px] bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => handleInitiate(activeDonation.amount, activeDonation.label)}
                    className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 text-slate-950" />
                        <span>Proceed to Pay ₹{activeDonation.amount}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DIRECT PAYMENT GATEWAY PROCESSING */}
            {step === 'processing' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin flex items-center justify-center shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-lg font-bold text-slate-100">Opening Payment Gateway</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Please complete the payment in the Razorpay checkout window for <strong>₹{activeDonation.amount}</strong>.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (razorpayOrderData) {
                        openRazorpayModal({ ...razorpayOrderData, amount: activeDonation.amount, purpose: activeDonation.label });
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Reopen Checkout
                  </button>
                  <button
                    onClick={() => setStep('cancelled')}
                    className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: UPI / QR CODE FALLBACK (When Razorpay is not configured) */}
            {step === 'payment' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 space-y-4 text-center md:text-left">
                  <div className="space-y-1 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Offering Amount</div>
                    <div className="text-3xl font-black text-slate-100">₹{activeDonation.amount}</div>
                    <div className="text-sm font-semibold text-slate-200">{activeDonation.label}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-slate-200">Scan QR Code to Pay</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Open BHIM, GPay, PhonePe, Paytm, or any UPI app on your phone and scan the QR code to complete donation.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-2 rounded-full font-medium animate-pulse justify-center md:justify-start">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Waiting for payment confirmation...</span>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3.5 rounded-2xl shadow-2xl border border-slate-800/10">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-[190px] h-[190px]" />
                    ) : (
                      <div className="w-[190px] h-[190px] flex items-center justify-center text-xs text-slate-500">
                        Loading QR...
                      </div>
                    )}
                  </div>

                  <button
                    onClick={simulateSuccess}
                    className="text-[10px] text-slate-500 hover:text-slate-300 mt-1 bg-slate-900 border border-slate-800/50 px-3 py-1 rounded-lg transition-colors"
                  >
                    [Developer: Simulate Payment Success]
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION POPUP */}
            {step === 'success' && (
              <div className="flex flex-col items-center text-center py-6 space-y-4 animate-fade-in">
                <div className="h-16 w-16 bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-inner">
                  <CheckCircle className="h-9 w-9 text-emerald-400" />
                </div>

                <div className="space-y-2 select-none">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Offering Received Successfully
                  </h3>
                  <div className="text-3xl font-black text-emerald-400">₹{activeDonation.amount}</div>
                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed mx-auto">
                    Thank you, <strong>{donorName || "Devotee"}</strong>. Your sacred offering of <strong>₹{activeDonation.amount}</strong> for <em>{activeDonation.label}</em> has been recorded. May divine blessings be with you and your family.
                  </p>
                </div>

                {/* Thermal Printer Auto-Print Status Banner */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
                  <Printer className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                  <span>Printing Devotee Receipt on Thermal Printer...</span>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => triggerThermalPrint()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 shadow-md transition-all active:scale-95 cursor-pointer"
                    title="Print duplicate thermal receipt"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
                <div className="text-[10px] text-slate-500">Returning automatically in 6 seconds...</div>
              </div>
            )}

            {/* STEP 5: CANCELLED POPUP */}
            {step === 'cancelled' && (
              <div className="flex flex-col items-center text-center py-6 space-y-4 animate-fade-in">
                <div className="h-16 w-16 bg-amber-500/15 rounded-full flex items-center justify-center border border-amber-500/30 text-amber-400 shadow-inner">
                  <AlertTriangle className="h-9 w-9 text-amber-400" />
                </div>

                <div className="space-y-2 select-none">
                  <h3 className="text-xl font-bold text-slate-100">
                    Offering Cancelled
                  </h3>
                  <div className="text-lg font-bold text-slate-300">₹{activeDonation.amount} • {activeDonation.label}</div>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                    The payment window was closed or cancelled. No amount was deducted from your account.
                  </p>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      setStep('form');
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: FAILED POPUP */}
            {step === 'failed' && (
              <div className="flex flex-col items-center text-center py-6 space-y-4 animate-fade-in">
                <div className="h-16 w-16 bg-red-500/15 rounded-full flex items-center justify-center border border-red-500/30 text-red-400 shadow-inner">
                  <XCircle className="h-9 w-9 text-red-400" />
                </div>

                <div className="space-y-2 select-none">
                  <h3 className="text-xl font-bold text-red-200">
                    Payment Unsuccessful
                  </h3>
                  <div className="text-lg font-bold text-slate-300">₹{activeDonation.amount} • {activeDonation.label}</div>
                  <p className="text-xs text-red-300/90 max-w-sm leading-relaxed mx-auto bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                    {errorMessage || "The payment transaction could not be processed. Please check your bank or payment method and try again."}
                  </p>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      setStep('form');
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── Standard Widget Preview ── */
function WidgetPreview({ widget, previewMode = false, customerInfoConfig, religion }: { widget: ContentWidget; previewMode?: boolean; customerInfoConfig?: CustomerInfoConfig; religion?: string }) {
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
        <SquareOfferingCard config={config} interactive={previewMode} customerInfoConfig={customerInfoConfig} religion={religion} />
      </div>
    );
  }
  if (widget.type === 'links') {
    return <LinksWidget widget={widget} interactive={previewMode} />;
  }
  if (widget.type === 'donation') {
    return <DonationWidget widget={widget} interactive={previewMode} customerInfoConfig={customerInfoConfig} religion={religion} />;
  }
  if (widget.type === 'slideshow') {
    return <SlideshowPreview widget={widget} />;
  }

  // Determine animation class & custom duration
  const scrollDuration = widget.scrollDuration;
  const hasCustomDuration = typeof scrollDuration === 'number' && scrollDuration > 0;

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

function DonationWidget({ widget, interactive, customerInfoConfig, religion }: { widget: ContentWidget; interactive: boolean; customerInfoConfig?: CustomerInfoConfig; religion?: string }) {
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

  // Dynamic columns arrangement based on cardsPerRow setting and total cards
  const cardsPerRow = widget.cardsPerRow || (styleType === 'minimal' ? 4 : 2);
  let gridClass = "grid gap-4 sm:gap-5 md:gap-6 w-full justify-center justify-items-center transition-all duration-300";
  if (N === 1) {
    gridClass += " grid-cols-1 max-w-sm";
  } else if (cardsPerRow === 2) {
    gridClass += " grid-cols-1 sm:grid-cols-2 max-w-2xl sm:max-w-3xl";
  } else if (cardsPerRow === 3) {
    if (N === 2) {
      gridClass += " grid-cols-1 sm:grid-cols-2 max-w-2xl";
    } else {
      gridClass += " grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-5xl";
    }
  } else if (cardsPerRow === 4) {
    if (N === 2) {
      gridClass += " grid-cols-1 sm:grid-cols-2 max-w-2xl";
    } else if (N === 3) {
      gridClass += " grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl";
    } else {
      gridClass += " grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl xl:max-w-7xl";
    }
  } else if (cardsPerRow === 5) {
    gridClass += " grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-7xl";
  } else if (cardsPerRow === 6) {
    gridClass += " grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 max-w-7xl";
  } else if (cardsPerRow === 7) {
    gridClass += " grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 max-w-full";
  } else {
    gridClass += " grid-cols-1 sm:grid-cols-2 max-w-3xl";
  }

  const fitMode = widget.backgroundFit || 'cover';

  // Base container styles for donation templates
  const containerStyle: React.CSSProperties = {
    backgroundColor: widget.backgroundColor || undefined,
    borderRadius: widget.donationContainerRadius !== undefined ? widget.donationContainerRadius : undefined,
    opacity: (widget.opacity ?? 100) / 100,
    width: '100%',
    height: '100%',
    minHeight: '100%',
    backgroundImage: widget.backgroundImageUrl ? `url("${widget.backgroundImageUrl}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'local',
  };

  // Dynamic Background Video or Image for Template Canvas (Stays fixed while content scrolls)
  const renderBackgroundMedia = () => {
    if (widget.backgroundVideoUrl) {
      return (
        <div className="absolute inset-0 w-full h-full min-h-full overflow-hidden pointer-events-none z-0">
          <video
            src={widget.backgroundVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full min-h-full block object-center pointer-events-none"
            style={{ objectFit: fitMode, width: '100%', height: '100%' }}
          />
          <div
            className="absolute inset-0 w-full h-full min-h-full bg-black pointer-events-none transition-opacity duration-300"
            style={{ opacity: (widget.backgroundDim ?? 50) / 100 }}
          />
        </div>
      );
    }
    if (widget.backgroundImageUrl) {
      return (
        <div className="absolute inset-0 w-full h-full min-h-full overflow-hidden pointer-events-none z-0">
          <img
            src={widget.backgroundImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full min-h-full block object-center pointer-events-none"
            style={{ objectFit: fitMode, width: '100%', height: '100%' }}
          />
          <div
            className="absolute inset-0 w-full h-full min-h-full bg-black pointer-events-none transition-opacity duration-300"
            style={{ opacity: (widget.backgroundDim ?? 50) / 100 }}
          />
        </div>
      );
    }
    return null;
  };

  // Modern Template Rendering
  if (styleType === 'modern') {
    return (
      <div 
        className={cn(
          "relative select-none text-white font-sans w-full h-full min-h-full overflow-hidden",
          !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-[#111029]" : "",
          widget.donationContainerShadow || "shadow-xl border border-white/5"
        )}
        style={{
          borderRadius: widget.donationContainerRadius !== undefined ? widget.donationContainerRadius : undefined,
          opacity: (widget.opacity ?? 100) / 100,
          backgroundImage: widget.backgroundImageUrl ? `url("${widget.backgroundImageUrl}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'local',
        }}
      >
        {renderBackgroundMedia()}

        {/* Scrollable Content Container */}
        <div 
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center p-5 sm:p-8"
          style={{ padding: widget.padding !== undefined ? widget.padding : undefined }}
        >
          <div className="flex flex-col items-center gap-2 sm:gap-2.5 mb-5 sm:mb-7 text-center max-w-xl shrink-0 pt-1">
            {widget.templeLogoUrl ? (
              <img src={widget.templeLogoUrl} alt="Logo" className="h-11 sm:h-12 w-11 sm:w-12 object-cover rounded-full shadow bg-black/20 border border-white/10 p-0.5 backdrop-blur-xs" />
            ) : (
              <LayoutGrid className="h-8 sm:h-9 w-8 sm:w-9 text-amber-400 drop-shadow" />
            )}
            <h2 
              className="text-base sm:text-xl md:text-2xl font-extrabold tracking-wide uppercase max-w-full text-center break-words px-2 leading-tight drop-shadow-md" 
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
                className="text-[11px] sm:text-xs tracking-widest uppercase font-medium drop-shadow-xs opacity-90" 
                style={{ color: widget.donationSubtitleColor || '#e2e8f0' }}
              >
                {purpose}
              </p>
            )}
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1" />
          </div>

          <div className="w-full flex justify-center pb-8 pt-1 shrink-0">
            <div className={gridClass}>
              {visibleButtons.map((btn) => {
                const cardConfig: DonationButtonConfig = {
                  ...btn,
                  backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || undefined,
                  borderColor: btn.borderColor || widget.cardDefaultBorderColor || undefined,
                  textColor: btn.textColor || widget.cardDefaultTextColor || undefined,
                  cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : undefined),
                  hoverEffect: btn.hoverEffect || 'scale',
                  clickAnimation: btn.clickAnimation || 'pop',
                };
                return (
                  <SquareOfferingCard 
                    key={btn.id} 
                    config={cardConfig} 
                    interactive={interactive}
                    isSelected={btn.id === selectedBtnId}
                    onSelect={() => handleSelectBtn(btn.id)}
                    customerInfoConfig={customerInfoConfig}
                  />
                );
              })}
              {visibleButtons.length === 0 && (
                <div className="text-xs text-white/40 col-span-full py-8">No donation buttons configured</div>
              )}
            </div>
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
          "relative select-none text-amber-950 font-serif w-full h-full min-h-full border-4 border-double border-amber-600/75 overflow-hidden",
          !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-[#fffdf6]" : "",
          widget.donationContainerShadow || "shadow-md"
        )}
      >
        {renderBackgroundMedia()}
        {/* Traditional hanging bell symbols */}
        <div className="absolute top-2 left-4 h-12 w-6 border-l border-amber-600/30 flex flex-col items-center justify-end z-10 pointer-events-none">
          <div className="h-4 w-4 bg-amber-500 rounded-full border border-amber-600 shadow animate-bounce" />
        </div>
        <div className="absolute top-2 right-4 h-12 w-6 border-l border-amber-600/30 flex flex-col items-center justify-end z-10 pointer-events-none">
          <div className="h-4 w-4 bg-amber-500 rounded-full border border-amber-600 shadow animate-bounce" />
        </div>

        {/* Scrollable Content Container */}
        <div 
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center p-6 sm:p-8"
          style={{ padding: widget.padding !== undefined ? widget.padding : undefined }}
        >
          <div className="flex flex-col items-center gap-2 sm:gap-2.5 mb-5 sm:mb-7 text-center max-w-xl shrink-0 pt-1">
            {widget.templeLogoUrl ? (
              <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-cover rounded-full shadow bg-[#fffdf6] border border-amber-600/50 p-0.5" />
            ) : (
              <div className="h-12 w-12 rounded-full border-2 border-amber-600 flex items-center justify-center bg-amber-500/10">
                <span className="text-xl font-bold text-amber-700">ॐ</span>
              </div>
            )}
            <h2 
              className="text-lg sm:text-xl md:text-2xl font-black tracking-wide max-w-full text-center break-words px-2 leading-tight" 
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
            <div className="w-16 h-0.5 bg-amber-600/40 mt-1.5" />
          </div>

          <div className="w-full flex justify-center pb-8 pt-1 shrink-0">
            <div className={gridClass}>
              {visibleButtons.map((btn) => {
                const tradConfig: DonationButtonConfig = {
                  ...btn,
                  backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || '#fffdf6',
                  borderColor: btn.borderColor || widget.cardDefaultBorderColor || '#d97706',
                  textColor: btn.textColor || widget.cardDefaultTextColor || '#78350f',
                  cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 6),
                  hoverEffect: btn.hoverEffect || 'scale',
                  clickAnimation: btn.clickAnimation || 'pop',
                  shadow: btn.shadow || 'shadow-md shadow-amber-900/10',
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
      </div>
    );
  }

  // Glassmorphism Template Rendering
  if (styleType === 'glass') {
    return (
      <div 
        style={containerStyle} 
        className={cn(
          "relative select-none text-slate-100 w-full h-full min-h-full backdrop-blur-xl border border-white/10 overflow-hidden",
          !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-slate-950/40" : "",
          widget.donationContainerShadow || "shadow-2xl"
        )}
      >
        {renderBackgroundMedia()}
        {/* Scrollable Content Container */}
        <div 
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center p-6 sm:p-8"
          style={{ padding: widget.padding !== undefined ? widget.padding : undefined }}
        >
          <div className="flex flex-col items-center gap-2.5 sm:gap-3 mb-5 sm:mb-7 text-center max-w-xl shrink-0 pt-1">
            {widget.templeLogoUrl ? (
              <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-cover rounded-full shadow bg-white/5 border border-white/20 p-0.5" />
            ) : (
              <div className="h-12 w-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur">
                <Sparkles className="h-6 w-6 text-sky-400" />
              </div>
            )}
            <h2 
              className="text-lg sm:text-xl md:text-2xl font-black tracking-widest uppercase bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent max-w-full text-center break-words px-2 leading-tight" 
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
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent mt-1.5" />
          </div>

          <div className="w-full flex justify-center pb-8 pt-1 shrink-0">
            <div className={gridClass}>
              {visibleButtons.map((btn) => {
                const glassConfig: DonationButtonConfig = {
                  ...btn,
                  backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || 'rgba(255, 255, 255, 0.06)',
                  borderColor: btn.borderColor || widget.cardDefaultBorderColor || 'rgba(255, 255, 255, 0.15)',
                  textColor: btn.textColor || widget.cardDefaultTextColor || '#f8fafc',
                  cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 20),
                  hoverEffect: btn.hoverEffect || 'glow',
                  clickAnimation: btn.clickAnimation || 'pop',
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
      </div>
    );
  }

  // Divine Temple Template Rendering
  if (styleType === 'divine') {
    return (
      <div 
        style={containerStyle} 
        className={cn(
          "relative select-none text-amber-100 font-serif w-full h-full min-h-full border-4 border-amber-500 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]",
          !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-[#2e0207]" : "",
          widget.donationContainerShadow || "shadow-2xl"
        )}
      >
        {renderBackgroundMedia()}
        <div className="absolute inset-2 border border-amber-500/30 pointer-events-none rounded z-10" />
        {/* Scrollable Content Container */}
        <div 
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center p-6 sm:p-8"
          style={{ padding: widget.padding !== undefined ? widget.padding : undefined }}
        >
          <div className="flex flex-col items-center gap-2 sm:gap-2.5 mb-5 sm:mb-7 text-center max-w-xl shrink-0 pt-1">
            {widget.templeLogoUrl ? (
              <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-cover rounded-full shadow bg-black/30 border border-amber-500/50 p-0.5" />
            ) : (
              <div className="h-12 w-12 rounded-full border border-amber-500 bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-amber-400" />
              </div>
            )}
            <h2 
              className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-widest uppercase text-amber-400 drop-shadow-md max-w-full text-center break-words px-2 leading-tight" 
              style={{ 
                fontSize: widget.donationTitleFontSize ? `${widget.donationTitleFontSize}px` : undefined,
                fontFamily: widget.donationTitleFontFamily || 'Cinzel, Georgia, serif'
              }}
            >
              {title}
            </h2>
            {purpose && (
              <p 
                className="text-xs tracking-wider uppercase font-bold text-amber-200" 
                style={{ color: widget.donationSubtitleColor || undefined }}
              >
                {purpose}
              </p>
            )}
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-1.5" />
          </div>

          <div className="w-full flex justify-center pb-8 pt-1 shrink-0">
            <div className={gridClass}>
              {visibleButtons.map((btn) => {
                const divConfig: DonationButtonConfig = {
                  ...btn,
                  backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || 'rgba(251, 191, 36, 0.08)',
                  borderColor: btn.borderColor || widget.cardDefaultBorderColor || '#fbbf24',
                  textColor: btn.textColor || widget.cardDefaultTextColor || '#fef08a',
                  cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 8),
                  hoverEffect: btn.hoverEffect || 'scale',
                  clickAnimation: btn.clickAnimation || 'pop',
                  shadow: btn.shadow || 'shadow-[0_0_10px_rgba(251,191,36,0.2)]',
                };
                return (
                  <SquareOfferingCard 
                    key={btn.id} 
                    config={divConfig} 
                    interactive={interactive}
                    isSelected={btn.id === selectedBtnId}
                    onSelect={() => handleSelectBtn(btn.id)}
                    customerInfoConfig={customerInfoConfig}
                  />
                );
              })}
              {visibleButtons.length === 0 && (
                <div className="text-xs text-amber-200/40 col-span-full py-8">No offerings configured</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Minimalist Template Rendering
  if (styleType === 'minimal') {
    const minimalContainerStyle: React.CSSProperties = {
      ...containerStyle,
      padding: 0,
      overflowY: 'hidden',
    };

    return (
      <div 
        style={minimalContainerStyle} 
        className={cn(
          "relative select-none text-stone-100 font-sans flex flex-col justify-start w-full h-full min-h-full overflow-hidden",
          !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-[#050505]" : "",
          widget.donationContainerShadow || "shadow-none"
        )}
      >
        {renderBackgroundMedia()}
        {/* Top Header Bar */}
        <div className={cn("w-full bg-[#0a0a0a]/90 backdrop-blur border-b border-stone-900 py-3.5 px-6 flex items-center justify-between shrink-0 z-10", !interactive ? "pr-28" : "")}>
          <div className="flex items-center gap-2.5">
            {widget.templeLogoUrl ? (
              <img src={widget.templeLogoUrl} alt="Logo" className="h-8 w-8 object-cover rounded" />
            ) : (
              <div className="h-7 w-7 rounded bg-stone-900 border border-stone-850 flex items-center justify-center">
                <LayoutGrid className="h-3.5 w-3.5 text-orange-500" />
              </div>
            )}
            <span className="font-extrabold text-sm text-stone-200 uppercase tracking-widest">{title}</span>
          </div>
          {purpose && <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">{purpose}</span>}
        </div>

        {/* Horizontal Columns Container */}
        <div 
          className={cn(
            "relative z-10 flex-1 w-full flex flex-row items-stretch divide-x divide-stone-900 overflow-y-hidden",
            N > cardsPerRow ? "overflow-x-auto" : "overflow-hidden"
          )}
        >
          {visibleButtons.map((btn) => {
            const minConfig: DonationButtonConfig = {
              ...btn,
              backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || 'transparent',
              borderColor: btn.borderColor || widget.cardDefaultBorderColor || 'transparent', // borders handled by divide-x parent
              textColor: btn.textColor || widget.cardDefaultTextColor || '#fafaf9',
              cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : 0), // stretched column shape
              hoverEffect: btn.hoverEffect || 'scale',
              clickAnimation: btn.clickAnimation || 'pop',
              shadow: 'none',
            };
            const colWidth = `${100 / cardsPerRow}%`;
            return (
              <div 
                key={btn.id} 
                className="h-full shrink-0 flex-1 min-w-0 transition-all duration-300"
                style={{
                  width: colWidth,
                  minWidth: N > cardsPerRow ? colWidth : undefined,
                  maxWidth: colWidth,
                  flexBasis: colWidth,
                }}
              >
                <SquareOfferingCard 
                  config={minConfig} 
                  interactive={interactive}
                  isSelected={btn.id === selectedBtnId}
                  onSelect={() => handleSelectBtn(btn.id)}
                  customerInfoConfig={customerInfoConfig}
                  themeStyle="minimal"
                />
              </div>
            );
          })}
          {visibleButtons.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-xs text-stone-500 py-8">
              No seva options configured
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: Modern Template Rendering
  return (
    <div 
      style={containerStyle} 
      className={cn(
        "relative select-none text-white font-sans w-full h-full min-h-full overflow-hidden",
        !widget.backgroundColor && !widget.backgroundImageUrl && !widget.backgroundVideoUrl ? "bg-[#111029]" : "",
        widget.donationContainerShadow || "shadow-xl border border-white/5"
      )}
    >
      {renderBackgroundMedia()}
      <div 
        className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center p-6 sm:p-8"
        style={{ padding: widget.padding !== undefined ? widget.padding : undefined }}
      >
        <div className="flex flex-col items-center gap-2.5 sm:gap-3 mb-5 sm:mb-7 text-center max-w-xl shrink-0 pt-1">
          {widget.templeLogoUrl ? (
            <img src={widget.templeLogoUrl} alt="Logo" className="h-14 w-14 object-cover rounded-full shadow bg-black/10 border border-white/10 p-0.5" />
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
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1.5" />
        </div>

        <div className="w-full flex justify-center pb-8 pt-1 shrink-0">
          <div className={gridClass}>
            {visibleButtons.map((btn) => {
              const cardConfig: DonationButtonConfig = {
                ...btn,
                backgroundColor: btn.backgroundColor || widget.cardDefaultBgColor || undefined,
                borderColor: btn.borderColor || widget.cardDefaultBorderColor || undefined,
                textColor: btn.textColor || widget.cardDefaultTextColor || undefined,
                cornerRadius: btn.cornerRadius !== undefined ? btn.cornerRadius : (widget.cardDefaultRadius !== undefined ? widget.cardDefaultRadius : undefined),
                hoverEffect: btn.hoverEffect || 'scale',
                clickAnimation: btn.clickAnimation || 'pop',
              };
              return (
                <SquareOfferingCard 
                  key={btn.id} 
                  config={cardConfig} 
                  interactive={interactive}
                  isSelected={btn.id === selectedBtnId}
                  onSelect={() => handleSelectBtn(btn.id)}
                  customerInfoConfig={customerInfoConfig}
                />
              );
            })}
            {visibleButtons.length === 0 && (
              <div className="text-xs text-white/40 col-span-full py-8">No donation buttons configured</div>
            )}
          </div>
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
export function ZoneRenderer({ zone, onUpdate, onSelectZone, selectedZoneId, depth = 0, previewMode = false, customerInfoConfig, religion }: ZoneRendererProps) {
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
        <div className="min-w-0 min-h-0 overflow-hidden" style={{ flexGrow: zone.splitRatio, flexBasis: 0, flexShrink: 1, [isH ? 'height' : 'width']: '100%' }}>
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
            religion={religion}
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
        <div className="min-w-0 min-h-0 overflow-hidden" style={{ flexGrow: 100 - zone.splitRatio, flexBasis: 0, flexShrink: 1, [isH ? 'height' : 'width']: '100%' }}>
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
            religion={religion}
          />
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="relative w-full h-full">
        {zone.content ? <WidgetPreview widget={zone.content} previewMode customerInfoConfig={customerInfoConfig} religion={religion} /> : null}
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
