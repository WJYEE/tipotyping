import { useLiveQuery } from "dexie-react-hooks";
import { statsRepo } from "@/db/repositories";
import { RecentSessionsCard } from "@/features/dashboard/RecentSessionsCard";
import { StatsRow } from "@/features/dashboard/StatsRow";
import { ThemeStatsCard } from "@/features/dashboard/ThemeStatsCard";
import { WelcomeHero } from "@/features/dashboard/WelcomeHero";

const EMPTY_STATS = { totalDurationMs: 0, totalAttempts: 0, correctCount: 0, wrongCount: 0, accuracy: 0 };

export function HomeDashboard() {
  const overallStats = useLiveQuery(() => statsRepo.getOverallStats(), []) ?? EMPTY_STATS;
  const recentSessions = useLiveQuery(() => statsRepo.getRecentSessions(5), []) ?? [];
  const themeStats = useLiveQuery(() => statsRepo.getThemeStats(5), []) ?? [];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-10 md:px-10">
      <WelcomeHero />
      <StatsRow stats={overallStats} />
      <div className="flex flex-col gap-6 lg:flex-row">
        <RecentSessionsCard sessions={recentSessions} />
        <ThemeStatsCard rows={themeStats} />
      </div>
    </div>
  );
}
