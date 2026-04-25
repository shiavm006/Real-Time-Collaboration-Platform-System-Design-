"use client";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border-color rounded-xl p-5 space-y-4">
      <div className="skeleton h-28 rounded-lg" />
      <div className="space-y-2">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  );
}

export function SkeletonEditor() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 p-8 animate-fade-in">
      <div className="skeleton h-8 w-64 rounded mb-8" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-0 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-9 w-full rounded-lg" />
      ))}
    </div>
  );
}
