/**
 * Version Switcher Component
 * 
 * Tab-like buttons that appear below AI responses to switch between 
 * different surface versions (Chat, Course, Guide).
 */

"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SurfaceType } from "@/lib/services/domain-types";
import { PiChat, PiBookOpenText, PiListChecks, PiSpinner } from "react-icons/pi";

interface VersionSwitcherProps {
  activeVersion: SurfaceType;
  generatingVersion: SurfaceType | null;
  availableVersions: {
    chat: boolean;
    learning: boolean;
    guide: boolean;
  };
  onSwitchVersion: (version: SurfaceType) => void;
  className?: string;
}

interface VersionTabProps {
  type: SurfaceType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isAvailable: boolean;
  isGenerating: boolean;
  onClick: () => void;
}

const VersionTab = memo(function VersionTab({
  type,
  label,
  icon,
  isActive,
  isAvailable,
  isGenerating,
  onClick,
}: VersionTabProps) {
  return (
    <button
      onClick={onClick}
      disabled={isGenerating}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
        "hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isActive 
          ? "bg-primary/10 text-primary border border-primary/20" 
          : "text-muted-foreground hover:text-foreground",
        isGenerating && "opacity-50 cursor-wait",
        !isAvailable && !isActive && "opacity-60"
      )}
      title={
        isGenerating 
          ? `Generating ${label}...` 
          : isAvailable 
            ? `Switch to ${label}` 
            : `Generate ${label}`
      }
    >
      {isGenerating ? (
        <PiSpinner className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      <span>{label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />
      )}
    </button>
  );
});

export const VersionSwitcher = memo(function VersionSwitcher({
  activeVersion,
  generatingVersion,
  availableVersions,
  onSwitchVersion,
  className,
}: VersionSwitcherProps) {
  const handleSwitch = useCallback(
    (version: SurfaceType) => {
      if (version !== activeVersion && !generatingVersion) {
        onSwitchVersion(version);
      }
    },
    [activeVersion, generatingVersion, onSwitchVersion]
  );

  return (
    <div 
      className={cn(
        "flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/40 w-fit",
        className
      )}
    >
      <VersionTab
        type="chat"
        label="Chat"
        icon={<PiChat className="h-3.5 w-3.5" />}
        isActive={activeVersion === "chat"}
        isAvailable={availableVersions.chat}
        isGenerating={generatingVersion === "chat"}
        onClick={() => handleSwitch("chat")}
      />
      <VersionTab
        type="learning"
        label="Course"
        icon={<PiBookOpenText className="h-3.5 w-3.5" />}
        isActive={activeVersion === "learning"}
        isAvailable={availableVersions.learning}
        isGenerating={generatingVersion === "learning"}
        onClick={() => handleSwitch("learning")}
      />
      <VersionTab
        type="guide"
        label="Guide"
        icon={<PiListChecks className="h-3.5 w-3.5" />}
        isActive={activeVersion === "guide"}
        isAvailable={availableVersions.guide}
        isGenerating={generatingVersion === "guide"}
        onClick={() => handleSwitch("guide")}
      />
    </div>
  );
});

export default VersionSwitcher;
