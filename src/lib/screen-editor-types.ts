import { getReligionConfig } from "./religion-config";

export type ZoneSplit = 'none' | 'horizontal' | 'vertical';

export type TextAnimation = 'none' | 'scroll-left' | 'scroll-right' | 'scroll-up' | 'scroll-down' | 'typewriter' | 'fade' | 'blink';

export type SlideTransition = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'flip' | 'none';

export type ContentWidgetType = 'image' | 'video' | 'text' | 'clock' | 'weather' | 'rss' | 'slideshow' | 'links' | 'donation' | 'empty' | 'donation_button';

export type LinkPlatform = 'instagram' | 'youtube' | 'facebook' | 'twitter' | 'tiktok' | 'linkedin' | 'github' | 'website';

export interface LinkItem {
  id: string;
  url: string;
  label: string;          // custom display label
  platform: LinkPlatform; // auto-detected, can be overridden
  iconColor?: string;
}

export type LinksOrientation = 'auto' | 'horizontal' | 'vertical';

export const MAX_LINKS = 4;

export function detectPlatform(url: string): LinkPlatform {
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('github.com')) return 'github';
  return 'website';
}

export interface SlideshowItem {
  id: string;
  imageUrl: string;
  imageName: string;
  duration: number; // seconds
  transition: SlideTransition;
  objectFit: 'cover' | 'contain' | 'fill';
  /** Optional overlay text */
  overlayText?: string;
  overlayFontSize?: number;
  overlayColor?: string;
  overlayAnimation?: TextAnimation;
}

/** Playlist item for image/video widgets with optional time-window scheduling. */
export interface PlaylistItem {
  id: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  mediaName: string;
  /** Seconds. For videos, 0 = play full video length. */
  duration: number;
  /** If true, only play during the configured window/days. Otherwise plays always. */
  scheduleEnabled?: boolean;
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  daysOfWeek?: number[]; // 0=Sun..6=Sat. Empty/undefined = every day.
}

export function createPlaylistItem(mediaType: 'image' | 'video' = 'image'): PlaylistItem {
  return {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mediaType,
    mediaUrl: '',
    mediaName: '',
    duration: mediaType === 'video' ? 0 : 8,
    scheduleEnabled: false,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  };
}

export interface DonationButtonConfig {
  id: string;
  amount: number;
  label: string; // e.g. "Archana Daan"
  description?: string;
  photoUrl?: string;
  photoName?: string;
  backgroundUrl?: string;
  backgroundName?: string;
  backgroundDim?: number; // 0 - 100%
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  cornerRadius?: number;
  gradient?: string;
  shadow?: string;
  hoverEffect?: 'scale' | 'glow' | 'bounce' | 'none';
  clickAnimation?: 'pop' | 'sink' | 'none';
  badge?: string;
  visible?: boolean;
}

export interface ContentWidget {
  id: string;
  type: ContentWidgetType;
  label: string;
  // text props
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  textAnimation?: TextAnimation;
  scrollSpeed?: 'slow' | 'normal' | 'fast';
  scrollDuration?: number; // seconds for one full scroll cycle
  // media props
  mediaUrl?: string;
  mediaName?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // playlist mode for image/video widgets
  playlistEnabled?: boolean;
  playlistItems?: PlaylistItem[];
  // slideshow props
  slides?: SlideshowItem[];
  slideshowLoop?: boolean;
  // links widget
  links?: LinkItem[];
  linksOrientation?: LinksOrientation;
  
  // templates / donation widget props
  templateStyle?: 'modern' | 'traditional' | 'glass';
  templeLogoUrl?: string;
  templeLogoName?: string;
  donationTitle?: string;
  donationPurpose?: string;
  donationTitleColor?: string;
  donationSubtitleColor?: string;
  donationTitleFontFamily?: string;
  donationTitleFontSize?: number;
  donationSpacing?: number;
  donationContainerShadow?: string;
  donationContainerGradient?: string;
  donationContainerRadius?: number;
  donationButtons?: DonationButtonConfig[];
  cardsPerRow?: number; // 2, 3, or 4 buttons per row (default: 2)

  // Background Media & Dim for Template/Screen
  backgroundType?: 'none' | 'image' | 'video';
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundMediaName?: string;
  backgroundDim?: number; // 0 - 100% (dim overlay)
  backgroundFit?: 'cover' | 'contain' | 'fill';
  
  // single button widget properties mapping
  buttonDescription?: string;
  buttonPhotoUrl?: string;
  buttonPhotoName?: string;
  buttonBackgroundUrl?: string;
  buttonBackgroundName?: string;
  buttonAmount?: number;
  buttonBgColor?: string;
  buttonBorderColor?: string;
  buttonTextColor?: string;
  buttonFontFamily?: string;
  buttonFontSize?: number;
  buttonCornerRadius?: number;
  buttonGradient?: string;
  buttonShadow?: string;
  buttonHoverEffect?: 'scale' | 'glow' | 'bounce' | 'none';
  buttonClickAnimation?: 'pop' | 'sink' | 'none';
  buttonBadge?: string;
  buttonVisible?: boolean;

  // styling
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface ScreenZone {
  id: string;
  split: ZoneSplit;
  /** 0-100, how much first child takes */
  splitRatio: number;
  content: ContentWidget | null;
  children: [ScreenZone, ScreenZone] | null;
}

export interface FormFieldConfig {
  enabled: boolean;
  required: boolean;
}

export interface CustomerInfoConfig {
  popupEnabled: boolean;
  fields: {
    name: FormFieldConfig;
    phone: FormFieldConfig;
    email: FormFieldConfig;
    address: FormFieldConfig;
    city: FormFieldConfig;
    state: FormFieldConfig;
    pincode: FormFieldConfig;
    gotra: FormFieldConfig;
    nakshatra: FormFieldConfig;
    purpose: FormFieldConfig;
    prayer: FormFieldConfig;
  };
}

export interface ScreenLayout {
  id: string;
  name: string;
  deviceId: string;
  resolution: { width: number; height: number };
  backgroundColor: string;
  rootZone: ScreenZone;
  customerInfoConfig?: CustomerInfoConfig;
}

export function createZone(id?: string): ScreenZone {
  return {
    id: id || `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    split: 'none',
    splitRatio: 50,
    content: null,
    children: null,
  };
}

export function createSlide(): SlideshowItem {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    imageUrl: '',
    imageName: '',
    duration: 5,
    transition: 'fade',
    objectFit: 'cover',
  };
}

export function createWidget(type: ContentWidgetType, style?: string): ContentWidget {
  const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base: ContentWidget = {
    id,
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
    opacity: 100,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        text: 'Your text here',
        fontSize: 24,
        fontWeight: '600',
        textColor: '#ffffff',
        textAnimation: 'none',
        scrollSpeed: 'normal',
      };
    case 'clock':
      return {
        ...base,
        label: 'Clock',
        fontSize: 48,
        textColor: '#ffffff',
        fontWeight: '700',
      };
    case 'weather':
      return { ...base, label: 'Weather Widget', text: '22°C Sunny' };
    case 'rss':
      return { ...base, label: 'RSS Feed', text: 'Breaking: News headline scrolling...', textAnimation: 'scroll-left', scrollSpeed: 'normal' };
    case 'image':
      return { ...base, objectFit: 'cover' };
    case 'video':
      return { ...base, objectFit: 'cover' };
    case 'slideshow':
      return {
        ...base,
        label: 'Slideshow',
        slides: [createSlide(), createSlide()],
        slideshowLoop: true,
      };
    case 'links':
      return {
        ...base,
        label: 'Quick Links',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: 0,
        borderRadius: 8,
        linksOrientation: 'auto',
        links: [
          { id: `link-${Date.now()}-1`, url: '', label: 'Instagram', platform: 'instagram' },
          { id: `link-${Date.now()}-2`, url: '', label: 'YouTube',   platform: 'youtube' },
          { id: `link-${Date.now()}-3`, url: '', label: 'Facebook',  platform: 'facebook' },
          { id: `link-${Date.now()}-4`, url: '', label: 'Website',   platform: 'website' },
        ],
      };
    case 'donation_button':
      return {
        ...base,
        label: 'Square Offering',
        buttonDescription: 'Devotee Offering',
        buttonAmount: 100,
        buttonBgColor: 'rgba(245, 158, 11, 0.1)',
        buttonBorderColor: '#f59e0b',
        buttonTextColor: '#ffffff',
        buttonCornerRadius: 12,
        buttonHoverEffect: 'scale',
        buttonClickAnimation: 'pop',
        buttonVisible: true,
      };
    case 'donation': {
      const selectedStyle = (style || 'modern') as 'modern' | 'traditional' | 'glass' | 'divine' | 'minimal';
      
      // Determine active religion (from localStorage or default)
      let activeReligion = 'hinduism';
      try {
        const cached = localStorage.getItem('sh_session');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.user?.user_metadata?.religion) activeReligion = parsed.user.user_metadata.religion;
        }
      } catch (e) {}

      // Get religion config from lib
      const relConfig = getReligionConfig(activeReligion);
      const causes = relConfig.presetCauses;
      const theme = relConfig.templateThemes[selectedStyle] || relConfig.templateThemes.modern;

      const defaultButtons: DonationButtonConfig[] = causes.slice(0, 4).map((c: any, idx: number) => ({
        id: `btn-${Date.now()}-${idx + 1}`,
        amount: c.amount,
        label: c.name,
        description: c.description,
        badge: c.isPopular ? 'Featured' : undefined,
        hoverEffect: 'scale',
        clickAnimation: 'pop',
        visible: true,
      }));

      if (selectedStyle === 'traditional') {
        return {
          ...base,
          label: `${relConfig.shortName} Traditional`,
          templateStyle: 'traditional',
          donationTitle: theme.header,
          donationPurpose: theme.subheader,
          backgroundColor: '#fffdf6',
          donationTitleColor: '#b91c1c',
          donationSubtitleColor: '#c2410c',
          donationTitleFontFamily: 'Playfair Display, Georgia, serif',
          donationSpacing: 4,
          donationContainerRadius: 8,
          cardsPerRow: 2,
          donationButtons: defaultButtons
        };
      }
      
      if (selectedStyle === 'glass') {
        return {
          ...base,
          label: `${relConfig.shortName} Glass`,
          templateStyle: 'glass',
          donationTitle: theme.header,
          donationPurpose: theme.subheader,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          donationTitleColor: '#38bdf8',
          donationSubtitleColor: '#94a3b8',
          donationSpacing: 5,
          donationContainerRadius: 24,
          cardsPerRow: 2,
          donationButtons: defaultButtons
        };
      }

      if (selectedStyle === 'divine') {
        return {
          ...base,
          label: `${relConfig.shortName} Divine`,
          templateStyle: 'divine',
          donationTitle: theme.header,
          donationPurpose: theme.subheader,
          backgroundColor: '#2e0207',
          donationTitleColor: '#fbbf24',
          donationSubtitleColor: '#fde047',
          donationTitleFontFamily: 'Cinzel, Georgia, serif',
          donationSpacing: 6,
          donationContainerRadius: 16,
          cardsPerRow: 2,
          donationButtons: defaultButtons
        };
      }

      if (selectedStyle === 'minimal') {
        return {
          ...base,
          label: `${relConfig.shortName} Minimal`,
          templateStyle: 'minimal',
          donationTitle: theme.header,
          donationPurpose: theme.subheader,
          backgroundColor: '#0c0a09',
          donationTitleColor: relConfig.accentColor || '#f97316',
          donationSubtitleColor: '#a1a1aa',
          donationSpacing: 4,
          donationContainerRadius: 0,
          cardsPerRow: 2,
          donationButtons: defaultButtons
        };
      }

      // Default: 'modern'
      return {
        ...base,
        label: `${relConfig.shortName} Modern`,
        templateStyle: 'modern',
        donationTitle: theme.header,
        donationPurpose: theme.subheader,
        backgroundColor: '#111029',
        donationTitleColor: '#fbbf24',
        donationSubtitleColor: '#e2e8f0',
        donationSpacing: 4,
        donationContainerRadius: 16,
        cardsPerRow: 2,
        donationButtons: defaultButtons
      };
    }
    default:
      return base;
  }
}

export function splitZone(zone: ScreenZone, direction: ZoneSplit): ScreenZone {
  if (direction === 'none') return zone;
  return {
    ...zone,
    split: direction,
    splitRatio: 50,
    content: null,
    children: [
      { ...createZone(), content: zone.content },
      createZone(),
    ],
  };
}

export function createDefaultLayout(deviceId: string, name: string): ScreenLayout {
  return {
    id: `layout-${Date.now()}`,
    name,
    deviceId,
    resolution: { width: 1920, height: 1080 },
    backgroundColor: '#1a1a2e',
    rootZone: createZone('root'),
  };
}
