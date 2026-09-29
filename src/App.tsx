import { Route, Routes } from "react-router-dom";
import { TopNav } from "@/components/layout/TopNav";
import { HomeDashboard } from "@/features/dashboard/HomeDashboard";
import { GameSetupScreen } from "@/features/game-setup/GameSetupScreen";
import { GameTypingScreen } from "@/features/game-typing/GameTypingScreen";
import { QuestionManagementScreen } from "@/features/question-management/QuestionManagementScreen";
import { ResultPlaceholder } from "@/features/result/ResultPlaceholder";
import { ThemeSelectionScreen } from "@/features/theme-selection/ThemeSelectionScreen";

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <TopNav />
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/play" element={<ThemeSelectionScreen />} />
        <Route path="/play/setup" element={<GameSetupScreen />} />
        <Route path="/play/typing" element={<GameTypingScreen />} />
        <Route path="/play/result" element={<ResultPlaceholder />} />
        <Route path="/questions" element={<QuestionManagementScreen />} />
      </Routes>
    </div>
  );
}
