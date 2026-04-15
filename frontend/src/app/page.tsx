import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' as const }}>
      <Dashboard />
    </div>
  );
}
