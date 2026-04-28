"use client";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  userId?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

// Return slightly varied grayscales deterministically
function getGrayScaleFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const shades = [
    "bg-brand-900",
    "bg-brand-800",
    "bg-brand-700",
    "bg-brand-600",
    "bg-foreground",
  ];
  return shades[Math.abs(hash) % shades.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  userId,
  size = "md",
  className = "",
}: AvatarProps) {
  const bgColor = userId ? getGrayScaleFromId(userId) : "bg-brand-900";
  const initials = getInitials(name);

  return (
    <div
      className={`
        ${sizeStyles[size]} ${bgColor}
        rounded-full flex items-center justify-center
        text-white font-medium
        ring-[1.5px] ring-background
        shrink-0 select-none
        ${className}
      `}
      title={name}
    >
      {initials}
    </div>
  );
}
