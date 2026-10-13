// 학습 패키지 정의. 패키지는 3개로 고정이지만 콘텐츠는 DB에 있어 새 패키지를 추가해도 화면 코드는 바뀌지 않는다.
import type { PackageDefinition, PackageId } from "@/types/package";

export const PACKAGES: PackageDefinition[] = [
  { id: "wjyee", name: "WJYEE", description: "개인 학습·포트폴리오·실험용 공간" },
  { id: "kb-bridge", name: "KB-Bridge", description: "KB-Bridge 교육생을 위한 공동 복습 공간" },
  { id: "self-study", name: "Self-Study", description: "누구나 활용할 수 있는 자기주도 학습 공간" },
];

export function getPackage(id: string | undefined): PackageDefinition | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export const PACKAGE_TABS = [
  { key: "questions", label: "문제은행" },
  { key: "concepts", label: "개념 정리" },
  { key: "tasks", label: "실습 과제" },
  { key: "memos", label: "메모" },
  { key: "resources", label: "추천 사이트" },
] as const;

export type PackageTabKey = (typeof PACKAGE_TABS)[number]["key"];

export function isPackageTab(value: string | undefined): value is PackageTabKey {
  return PACKAGE_TABS.some((t) => t.key === value);
}

export function packagePath(packageId: PackageId, tab?: PackageTabKey): string {
  return tab ? `/packages/${packageId}/${tab}` : `/packages/${packageId}`;
}

/** 직접 만든(origin: user) 콘텐츠 id 접두어와 구분하기 위한 KB-Bridge 번들 id 접두어 */
export const KB_BRIDGE_ID_PREFIX = "kbb-";

/** 번들 문제를 담는 Category / Theme id. 기존 사용자·기본 Theme과 절대 겹치지 않는 고정 id를 쓴다. */
export const KB_BRIDGE_CATEGORY_ID = "kbb-category";
export function kbBridgeThemeId(categoryKey: string): string {
  return `kbb-theme-${categoryKey}`;
}
