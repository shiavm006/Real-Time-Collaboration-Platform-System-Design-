"use client";

import { Dashboard } from "@/components/Dashboard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Home() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}
