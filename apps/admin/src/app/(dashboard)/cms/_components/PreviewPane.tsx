"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ViewMode = "desktop" | "tablet" | "mobile";

export function PreviewPane({ previewKey, url }: { previewKey: number; url: string }) {
  const [view, setView] = useState<ViewMode>("desktop");

  const viewSizes = {
    desktop: "w-full h-full",
    tablet: "w-[768px] h-[1024px] max-h-full",
    mobile: "w-[375px] h-[667px] max-h-full",
  };

  return (
    <div className="hidden lg:flex flex-1 flex-col bg-muted/30 relative overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full">
          <Button
            variant={view === "desktop" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setView("desktop")}
            title="Desktop view"
          >
            <Monitor className="size-4" />
          </Button>
          <Button
            variant={view === "tablet" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setView("tablet")}
            title="Tablet view"
          >
            <Tablet className="size-4" />
          </Button>
          <Button
            variant={view === "mobile" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setView("mobile")}
            title="Mobile view"
          >
            <Smartphone className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            LIVE
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            asChild
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center bg-[#f5f5f7]">
        <div 
          className={cn(
            "bg-white shadow-2xl border border-border overflow-hidden transition-all duration-300 ease-in-out origin-top",
            view === "desktop" ? "rounded-none" : "rounded-[2rem] border-[8px] border-slate-800",
            viewSizes[view]
          )}
        >
          {/* Mock Mobile/Tablet notch/bar */}
          {view !== "desktop" && (
            <div className="h-6 w-full bg-slate-800 flex items-center justify-center">
              <div className="w-20 h-1 rounded-full bg-slate-700" />
            </div>
          )}
          
          <iframe
            key={previewKey}
            src={url}
            className="w-full h-full border-0"
            title="Client Website Preview"
          />

          {/* Mock Home indicator */}
          {view !== "desktop" && (
            <div className="h-4 w-full bg-slate-800 flex items-center justify-center">
              <div className="w-1/3 h-1 rounded-full bg-slate-700 mb-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
