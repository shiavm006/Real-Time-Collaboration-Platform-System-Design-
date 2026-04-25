"use client";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "primary";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", dot = false, pulse = false, children, className = "" }: BadgeProps) {
  
  // Strict B&W mapping for semantic states
  let dotStyle = "bg-foreground";
  if (variant === "danger") dotStyle = "bg-transparent border border-foreground"; // Hollow dot for offline
  if (variant === "warning") dotStyle = "bg-muted"; // Lighter gray for reconnecting/saving

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-0 py-0.5
        text-xs font-medium
        text-brand-600
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyle} ${pulse ? "animate-pulse-dot" : ""}`} />
      )}
      {children}
    </span>
  );
}
