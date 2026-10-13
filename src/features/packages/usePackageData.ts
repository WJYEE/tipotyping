import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { packageRepo } from "@/db/repositories";
import { getPackageCategories } from "@/lib/packages/kbBridgeCategories";
import type { QuestionRecord } from "@/types/domain";
import type { PackageId } from "@/types/package";

export const INCLUDE_UNREVIEWED_KEY = "package.includeUnreviewed";

/** 패키지 하나의 모든 콘텐츠를 실시간으로 읽는다. 기본값(빈 배열)으로 시작해 로딩 중 깜빡임이 없다. */
export function usePackageData(packageId: PackageId) {
  const questions = useLiveQuery(() => packageRepo.listQuestions(packageId), [packageId]);
  const derived = useLiveQuery(() => packageRepo.listDerived(packageId), [packageId]);
  const concepts = useLiveQuery(() => packageRepo.listConcepts(packageId), [packageId]);
  const tasks = useLiveQuery(() => packageRepo.listTasks(packageId), [packageId]);
  const memos = useLiveQuery(() => packageRepo.listMemos(packageId), [packageId]);
  const resources = useLiveQuery(() => packageRepo.listResources(packageId), [packageId]);
  const records = useLiveQuery(() => db.questionRecords.toArray(), []);
  const includeUnreviewedSetting = useLiveQuery(
    async () => ((await db.settings.get(INCLUDE_UNREVIEWED_KEY))?.value as boolean | undefined) ?? true,
    [],
  );

  const recordMap = new Map<string, QuestionRecord>((records ?? []).map((r) => [r.questionId, r]));
  return {
    loaded: questions !== undefined && records !== undefined,
    categories: getPackageCategories(packageId),
    questions: questions ?? [],
    derived: derived ?? [],
    concepts: concepts ?? [],
    tasks: tasks ?? [],
    memos: memos ?? [],
    resources: resources ?? [],
    recordMap,
    includeUnreviewed: includeUnreviewedSetting ?? true,
  };
}

export type PackageData = ReturnType<typeof usePackageData>;

/** 문제의 카테고리 키: kbb-theme-sql → sql */
export function categoryKeyOfQuestion(q: { themeId: string }): string {
  return q.themeId.replace(/^kbb-theme-/, "");
}
