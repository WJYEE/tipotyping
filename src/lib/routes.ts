// Stellation(Knowledge & Career Universe) route 상수와 호환 처리. React/Router에 의존하지 않아 테스트하기 쉽다.

/** 정식 제품 route */
export const STELLATION_PATH = "/stellation";

/** 개발 중 쓰던 실험용 route. 기존 링크/북마크가 깨지지 않도록 STELLATION_PATH로 redirect한다. */
export const LEGACY_SKY_LAB_PATH = "/constellation-lab";

/** Stellation 화면(몰입형, TopNav 없음)인지. redirect가 일어나는 첫 렌더에서도 nav가 깜빡이지 않도록 legacy 경로도 포함한다. */
export function isStellationPath(pathname: string): boolean {
  return pathname.startsWith(STELLATION_PATH) || pathname.startsWith(LEGACY_SKY_LAB_PATH);
}

/** legacy route에서 이동할 주소. 개발용 query(예: ?milkyWay=2)와 hash를 그대로 보존한다. */
export function legacySkyLabRedirectTarget(search: string, hash: string): string {
  return `${STELLATION_PATH}${search}${hash}`;
}
