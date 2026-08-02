import { type DragEvent } from "react";
import {
  Type,
  Clock,
  CloudSun,
  Rss,
  Square,
  LayoutGrid,
} from "lucide-react";
import { ContentWidgetType } from "@/lib/screen-editor-types";

interface WidgetPaletteItem {
  type: ContentWidgetType;
  style?: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const widgets: WidgetPaletteItem[] = [
  { type: 'text', label: 'Text Info', icon: Type, color: 'bg-warning/15 text-warning' },
  { type: 'clock', label: 'Clock Display', icon: Clock, color: 'bg-success/15 text-success' },
  { type: 'weather', label: 'Weather Info', icon: CloudSun, color: 'bg-warning/15 text-warning' },
  { type: 'rss', label: 'RSS Ticker', icon: Rss, color: 'bg-destructive/15 text-destructive' },
  { type: 'donation_button', label: 'Square Offering', icon: Square, color: 'bg-emerald-500/15 text-emerald-500' },
  { type: 'donation', style: 'modern', label: 'Temple Modern', icon: LayoutGrid, color: 'bg-indigo-500/15 text-indigo-500' },
  { type: 'donation', style: 'traditional', label: 'Temple Traditional', icon: LayoutGrid, color: 'bg-amber-500/15 text-amber-500' },
  { type: 'donation', style: 'glass', label: 'Temple Glass', icon: LayoutGrid, color: 'bg-sky-500/15 text-sky-500' },
  { type: 'donation', style: 'divine', label: 'Temple Divine', icon: LayoutGrid, color: 'bg-rose-500/15 text-rose-500' },
  { type: 'donation', style: 'minimal', label: 'Temple Minimal', icon: LayoutGrid, color: 'bg-orange-500/15 text-orange-500' },
];

export function WidgetPalette() {
  const handleDragStart = (e: DragEvent, type: ContentWidgetType, style?: string) => {
    e.dataTransfer.setData('widget-type', type);
    if (style) {
      e.dataTransfer.setData('template-style', style);
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Widgets & Templates
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {widgets.map((w, idx) => (
          <div
            key={`${w.type}-${w.style || idx}`}
            draggable
            onDragStart={(e) => handleDragStart(e, w.type, w.style)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm hover:border-primary/30 select-none"
          >
            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${w.color}`}>
              <w.icon className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">{w.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Drag items onto the screen canvas
      </p>
    </div>
  );
}
