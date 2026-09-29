import { useState } from "react";
import { TopNav, type NavView } from "@/components/layout/TopNav";
import { HomeDashboard } from "@/features/dashboard/HomeDashboard";
import { QuestionManagementScreen } from "@/features/question-management/QuestionManagementScreen";
import { ThemeSelectionScreen } from "@/features/theme-selection/ThemeSelectionScreen";

export default function App() {
  const [view, setView] = useState<NavView>("home");

  return (
    <div className="min-h-screen bg-bg">
      <TopNav active={view} onNavigate={setView} />
      {view === "home" && <HomeDashboard />}
      {view === "theme-selection" && <ThemeSelectionScreen />}
      {view === "question-management" && <QuestionManagementScreen />}
    </div>
  );
}
