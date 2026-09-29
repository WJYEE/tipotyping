import { TopNav } from "@/components/layout/TopNav";
import { HomeDashboard } from "@/features/dashboard/HomeDashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <TopNav />
      <HomeDashboard />
    </div>
  );
}
