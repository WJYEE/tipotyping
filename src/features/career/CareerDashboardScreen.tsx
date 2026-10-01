import { CompetencyBubbleMapCard } from "@/features/career/components/CompetencyBubbleMapCard";
import { OverviewSection } from "@/features/career/components/OverviewSection";
import { PreparationGapCard } from "@/features/career/components/PreparationGapCard";
import { RecentSavedJdCard } from "@/features/career/components/RecentSavedJdCard";
import { RoleMixCard } from "@/features/career/components/RoleMixCard";
import {
  competencyBubbles,
  overviewMetrics,
  preparationGapRows,
  roleMixEntries,
  savedJdRows,
} from "@/features/career/mockData";

export function CareerDashboardScreen() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-8 md:px-11 md:py-8">
      <OverviewSection lastAnalyzedAt="2026.10.01 13:40" metrics={overviewMetrics} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <CompetencyBubbleMapCard bubbles={competencyBubbles} />
        <RoleMixCard entries={roleMixEntries} onSelectRole={(role) => console.log("select role", role.id)} />
      </div>

      <PreparationGapCard rows={preparationGapRows} />

      <RecentSavedJdCard rows={savedJdRows} totalCount={14} />
    </div>
  );
}
