import { Route, Routes, useLocation } from "react-router-dom";
import { CareerTopNav } from "@/components/layout/CareerTopNav";
import { TopNav } from "@/components/layout/TopNav";
import { CareerDashboardScreen } from "@/features/career/CareerDashboardScreen";
import { JdDetailScreen } from "@/features/career/jd-detail/JdDetailScreen";
import { JdLibraryScreen } from "@/features/career/jd-library/JdLibraryScreen";
import { HomeDashboard } from "@/features/dashboard/HomeDashboard";
import { GameSetupScreen } from "@/features/game-setup/GameSetupScreen";
import { GameTypingScreen } from "@/features/game-typing/GameTypingScreen";
import { QuestionManagementScreen } from "@/features/question-management/QuestionManagementScreen";
import { ResultPlaceholder } from "@/features/result/ResultPlaceholder";
import { ThemeSelectionScreen } from "@/features/theme-selection/ThemeSelectionScreen";

export default function App() {
  const location = useLocation();
  const isCareer = location.pathname.startsWith("/career");

  return (
    <div className={`min-h-screen ${isCareer ? "bg-career-bg" : "bg-bg"}`}>
      {isCareer ? <CareerTopNav /> : <TopNav />}
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/play" element={<ThemeSelectionScreen />} />
        <Route path="/play/setup" element={<GameSetupScreen />} />
        <Route path="/play/typing" element={<GameTypingScreen />} />
        <Route path="/play/result" element={<ResultPlaceholder />} />
        <Route path="/questions" element={<QuestionManagementScreen />} />
        <Route path="/career" element={<CareerDashboardScreen />} />
        <Route path="/career/jd-library" element={<JdLibraryScreen />} />
        <Route path="/career/jd-library/:jobPostingId" element={<JdDetailScreen />} />
      </Routes>
    </div>
  );
}
