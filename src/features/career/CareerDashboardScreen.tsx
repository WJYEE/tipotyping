import { useLiveQuery } from "dexie-react-hooks";
import { careerStatsRepo } from "@/db/repositories/careerStatsRepo";
import { CompetencyBubbleMapCard } from "@/features/career/components/CompetencyBubbleMapCard";
import { OverviewSection } from "@/features/career/components/OverviewSection";
import { PreparationGapCard } from "@/features/career/components/PreparationGapCard";
import { RecentSavedJdCard } from "@/features/career/components/RecentSavedJdCard";
import { RoleMixCard } from "@/features/career/components/RoleMixCard";

const EMPTY_OVERVIEW = {
  savedJdCount: 0,
  extractedCompetencyCount: 0,
  connectedEvidenceCount: 0,
  preparationGapCount: 0,
  lastUpdatedAt: null,
};

export function CareerDashboardScreen() {
  const overview = useLiveQuery(() => careerStatsRepo.getOverviewStats(), []) ?? EMPTY_OVERVIEW;
  const bubbles = useLiveQuery(() => careerStatsRepo.getCompetencyBubbleStats(), []) ?? [];
  const roleMix = useLiveQuery(() => careerStatsRepo.getRoleMixStats(), []) ?? [];
  const recentJds = useLiveQuery(() => careerStatsRepo.getRecentJobPostings(5), []) ?? [];

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-8 md:px-11 md:py-8">
      <OverviewSection stats={overview} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <CompetencyBubbleMapCard bubbles={bubbles} />
        <RoleMixCard stats={roleMix} />
      </div>

      <PreparationGapCard />

      <RecentSavedJdCard rows={recentJds} totalCount={overview.savedJdCount} />
    </div>
  );
}
