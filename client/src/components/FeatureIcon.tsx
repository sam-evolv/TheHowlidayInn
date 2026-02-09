import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "coin" | "bare" | "duotone";

export function FeatureIcon({
  icon: Icon,
  variant = "coin",
  className,
  size = 28,
  stroke = 1.75,
}: {
  icon: LucideIcon;
  variant?: Variant;
  className?: string;
  size?: number;
  stroke?: number;
}) {
  if (variant === "bare") {
    return (
      <span className={cn("inline-flex items-center justify-center", className)}>
        <Icon className="text-[#1B5E4A]" strokeWidth={stroke} style={{ width: size, height: size }} />
      </span>
    );
  }

  if (variant === "duotone") {
    return (
      <span
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-full",
          "bg-white ring-1 ring-[rgba(15,23,32,.08)] shadow-sm"
        , className)}
      >
        <Icon className="text-[#1B5E4A]" strokeWidth={stroke} style={{ width: size, height: size }} />
      </span>
    );
  }

  // default: "coin"
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-full",
        "bg-white ring-1 ring-[rgba(15,23,32,.08)] shadow-sm",
        "transition-shadow"
      , className)}
    >
      <Icon className="text-[#1B5E4A]" strokeWidth={stroke} style={{ width: size, height: size }} />
    </span>
  );
}
