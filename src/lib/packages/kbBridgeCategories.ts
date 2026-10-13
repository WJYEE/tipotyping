import categories from "@/content/kbbridge/categories.json";
import { kbBridgeThemeId } from "@/lib/packages/definitions";
import type { PackageCategory, PackageId } from "@/types/package";

/** 패키지별 카테고리 목록. 문제·개념·실습 탭의 카테고리 선택에 쓴다. KB-Bridge 외 패키지는 아직 정의된 카테고리가 없다. */
export function getPackageCategories(packageId: PackageId): PackageCategory[] {
  if (packageId !== "kb-bridge") return [];
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ key: c.id, name: c.name, themeId: kbBridgeThemeId(c.id), group: c.package }));
}
