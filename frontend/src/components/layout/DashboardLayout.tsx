"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content area */}
      <main
        className={`
          flex-1 min-h-screen transition-all duration-300 ease-out
          ${sidebarOpen ? "lg:ml-[280px]" : "lg:ml-[68px]"}
        `}
      >
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border-color px-4 h-14 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-surface-hover text-muted transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ml-3 font-semibold text-foreground">CollabDoc</span>
        </div>

        <div className="flex flex-col min-h-[calc(100vh-56px)] lg:min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
