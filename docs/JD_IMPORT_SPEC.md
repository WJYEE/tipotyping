# Career JD Import JSON Spec

외부(ChatGPT/Claude 등)에서 JD를 분석해 TipoTyping Career에 Import하기 위한 정확한 스펙이다.
이 문서는 **현재 구현된 코드의 동작을 그대로 설명**한 것이며, 스펙과 코드가 다르면 코드가 맞다.
`docs/QUESTION_IMPORT_SPEC.md`(Learning 문제은행용)와 같은 성격의 문서이고 형식도 맞춘다.

관련 코드:
- 파싱/검증/Import: `src/lib/importJobPostings.ts`
- JD/Requirement/Competency/Role 타입: `src/types/career.ts`
- Import UI: `src/features/career/jd-library/JdAddModal.tsx` ("JSON Import" 탭)
- Dashboard 집계(Import 직후 자동 반영): `src/db/repositories/careerStatsRepo.ts`

## 0. 전체 파이프라인에서의 위치

```
docs/jd/*.txt  →  분석(ChatGPT/Claude)  →  이 스펙의 JSON  →  JSON Import  →  IndexedDB  →  Dashboard
   (원문 보존)        (Requirement/                                                      (자동 집계,
                   Competency/Role 표준화)                                                 새로고침 불필요)
```

- `docs/jd/*.txt` — 원문. 이 스펙과 무관하게 절대 수정하지 않는다.
- 이 JSON — "analyzed JSON". 분석 결과(Requirement/Competency/Role)가 **처음** 구조화되는 지점.
- IndexedDB — JSON Import가 끝나면 즉시 실제 서비스 데이터가 된다. 이후 JSON 파일을 지우거나
  고쳐도 이미 들어간 DB 데이터는 바뀌지 않는다(반대로 DB를 지워도 JSON 파일은 그대로 남는다).
- Dashboard는 `useLiveQuery`로 같은 IndexedDB 테이블을 직접 구독하므로, Import 직후 화면을
  새로고침하지 않아도 Overview/Competency Bubble Map/Role Mix/Recent JD가 즉시 갱신된다.

앱 자체는 JD 원문을 분석하지 않는다 — `rawText`/`competencies`/`roles`는 이미 정제된 값으로
들어온다는 전제이고, Import 코드는 형식만 검증하고 그대로 신뢰해 저장한다.

## 1. 최상위 구조

JSON은 **JD 객체 하나** 또는 **JD 객체의 배열**, 둘 다 허용한다(단일/복수 JD 모두 지원).

```json
{ "companyName": "...", "postingTitle": "...", "positionTitle": "..." }
```

```json
[
  { "companyName": "...", "postingTitle": "...", "positionTitle": "..." },
  { "companyName": "...", "postingTitle": "...", "positionTitle": "..." }
]
```

객체 하나로 주면 내부적으로 길이 1인 배열로 감싼 뒤 동일하게 처리한다(`parseJdImportJson`).
배열도 객체도 아니면(문자열/숫자/`null` 등) 파싱 단계에서 즉시 에러를 던지고 Import가 중단된다.

## 2. JD 1개(JdImportRow)의 필드

```ts
{
  companyName: string;                 // 필수
  postingTitle: string;                // 필수
  positionTitle: string;                // 필수
  jdUrl?: string;                       // 선택 — 출처 저장/이동용. 크롤링하지 않는다.
  responsibilities?: string;            // 선택, 기본 ""
  qualifications?: string;              // 선택, 기본 ""
  preferredQualifications?: string;     // 선택, 기본 ""
  applicationStartDate?: string;        // 선택, "YYYY-MM-DD"
  applicationEndDate?: string;          // 선택, "YYYY-MM-DD"
  employmentType?: "full-time" | "contract" | "intern" | "freelance" | "other"; // 선택
  experienceLevel?: "entry" | "experienced" | "any"; // 선택
  workLocation?: string;                // 선택
  requirements?: JdImportRequirement[]; // 선택, 3장 참고
}
```

| 필드 | 필수 | 규칙 |
|---|---|---|
| `companyName` | O | 비어있지 않은 문자열. **기존 Company와 이름이 같으면 재사용**(`companyRepo.getOrCreate`), 없으면 새로 만든다. |
| `postingTitle` | O | 공고명. 비어있지 않은 문자열. |
| `positionTitle` | O | 직무명. 비어있지 않은 문자열. |
| `jdUrl` | 선택 | 문자열이면 그대로 저장. 형식(URL 유효성) 검증은 하지 않는다. |
| `responsibilities` / `qualifications` / `preferredQualifications` | 선택 | 문자열. 생략하면 빈 문자열로 저장된다. |
| `applicationStartDate` / `applicationEndDate` | 선택 | `/^\d{4}-\d{2}-\d{2}$/` 정규식만 검사한다(실존하는 날짜인지는 검증하지 않음 — `2026-13-99`도 통과). |
| `employmentType` | 선택 | canonical 영문 키(`full-time`/`contract`/`intern`/`freelance`/`other`) **또는** 대응하는 한국어 라벨(정규직/계약직/인턴/프리랜서/기타, `jobPostingLabels.ts`의 `employmentTypeLabel`과 동일)을 받는다. 대소문자·앞뒤 공백은 무시한다. DB에는 항상 canonical 영문 키로 저장된다(DB 스키마/UI 표시는 바뀌지 않음). 어느 쪽에도 매칭되지 않으면 그 JD 행 전체가 오류 처리된다 — 임의로 추론하지 않는다. |
| `experienceLevel` | 선택 | 같은 규칙. canonical 영문 키(`entry`/`experienced`/`any`) 또는 한국어 라벨(신입/경력/신입·경력 무관, `experienceLevelLabel`과 동일 — "무관"만 써도 `any`로 인식). |
| `workLocation` | 선택 | 자유 문자열. |
| `requirements` | 선택 | 배열이 아니면 오류. 각 항목 규칙은 3장. 생략하면 Requirement 없이 JD만 저장된다. |

## 3. `requirements[]` 항목(JdImportRequirement) — **딱 4개 필드만**

```ts
{
  rawText: string;                           // 필수 — JD 원문 그대로, 한 글자도 고치지 않는다
  sourceSection?: "responsibility" | "qualification" | "preferred"; // 선택
  competencies?: { name: string; category: "data" | "business" | "product" | "tools" }[]; // 선택
  roles?: string[];                          // 선택 — Role 이름만. 자유 문자열 배열.
}
```

| 필드 | 필수 | 규칙 |
|---|---|---|
| `rawText` | O | 비어있지 않은 문자열. **JD 원문 문장을 그대로** 옮긴다 — 자연어를 분석/요약/패러프레이즈하지 않는다. |
| `sourceSection` | 선택 | 셋 중 하나가 아니면 오류. 이 Requirement가 담당업무/자격요건/우대사항 중 어디서 나왔는지 표시만 한다(그룹핑용, 채점/집계에 영향 없음). |
| `competencies` | 선택 | **자연어 문장이 아니라 표준화된 키워드**다(예: `"SQL"`, `"A/B Testing"`, `"KPI 설계"`). `name`+`category` 둘 다 필수. `category`가 4종 중 하나가 아니면 오류. |
| `roles` | 선택 | 표준화된 Role 이름 문자열 배열(예: `"Business DA"`). `category` 없음 — Role은 분류 체계가 없는 단순 사전이다. |

이 네 개 외의 필드(예: 예전에 있었던 `normalizedLabel`, Competency의 `learningThemeKey`)는 **조용히
무시**된다 — 에러가 나지 않는다. 구버전 포맷으로 만든 JSON도 그대로 Import된다(하위 호환).

### Competency/Role 표준화(사전 재사용) 규칙

- `competencies[].name`이 **기존 Competency와 이름이 같으면 그 Competency를 그대로 재사용**한다
  (`competencyRepo.getOrCreate`). 새 `category`를 보내도 기존 Competency의 category는 바뀌지
  않는다 — category는 그 이름이 처음 등장했을 때만 정해지는 값이다.
- `roles[]`도 동일하게 이름으로 재사용/생성한다(`roleRepo.getOrCreate`).
- 따라서 **서로 다른 JD에 같은 Competency/Role 이름을 쓰면 자동으로 하나로 통합**되고, Dashboard의
  Competency Bubble Map(수요 JD 수)과 Role Mix(비율)는 이 통합된 단위로 집계된다 — 두 JD가 각자
  "A/B Testing"을 쓰면 버블 하나에 수요 2로 잡히지, 버블 두 개로 쪼개지지 않는다.
- 이름 비교는 **대소문자/공백까지 완전 일치**다("SQL"과 "sql"은 다른 Competency로 취급된다) — 분석
  단계(ChatGPT/Claude)에서 키워드 표기를 일관되게 맞춰야 한다.

## 4. 오류 처리와 중복 판정

- `requirements[]` 안의 항목 **하나라도 형식이 틀리면 그 JD 행 전체가 오류 처리**되고(일부
  Requirement만 저장되는 일은 없다), `errors: [{ index, reason }]`에 담긴다. 다른 JD 행은 영향받지
  않고 계속 처리된다.
- 중복 판정은 `companyName + postingTitle + positionTitle`(trim + 소문자 비교) 조합이 **이미 DB에
  있는 JD와 같으면 저장하지 않고 `duplicates`로 센다**(에러 아님). 같은 조합이 같은 Import 파일
  안에 두 번 있어도 두 번째부터는 중복으로 처리된다.
- 결과는 `{ imported, duplicates, errors }` 세 숫자로 요약된다 — "성공/중복/실패".

## 5. 전체 예시

```json
[
  {
    "companyName": "원티드랩",
    "postingTitle": "데이터 분석가 인턴 [AI기술팀]",
    "positionTitle": "데이터 분석가 인턴 [AI기술팀]",
    "jdUrl": "",
    "employmentType": "intern",
    "workLocation": "서울 송파구 올림픽로 300, 35층",
    "responsibilities": "진행 중인 A/B 테스트의 지표 상태를 주기적으로 점검하고 이상 신호를 정리\n...",
    "qualifications": "여러 테이블을 JOIN하고 서브쿼리·CTE로 단계를 나누어...\n...",
    "preferredQualifications": "",
    "requirements": [
      {
        "rawText": "진행 중인 A/B 테스트의 지표 상태를 주기적으로 점검하고 이상 신호를 정리",
        "sourceSection": "responsibility",
        "competencies": [{ "name": "A/B Testing", "category": "product" }],
        "roles": ["Business DA"]
      },
      {
        "rawText": "여러 테이블을 JOIN하고 서브쿼리·CTE로 단계를 나누어 원하는 집계 결과를 SQL로 직접 만들어낼 수 있는 분",
        "sourceSection": "qualification",
        "competencies": [{ "name": "SQL", "category": "data" }]
      }
    ]
  }
]
```

이 배열을 `.json` 파일로 저장해 JD Library 화면의 "JD 추가 → JSON Import" 탭에 업로드하면 된다.

## 6. "analyzed JSON" 권장 저장 경로

`docs/jd/analyzed/{원본 txt와 같은 파일명}.json`

예: 원문이 `docs/jd/원티드랩_DA_intern_202610.txt`라면, 그 JD를 분석해 만든 Import용 JSON은
`docs/jd/analyzed/원티드랩_DA_intern_202610.json`에 둔다.

- 원문과 파일명(확장자만 다름)을 맞춰서 "이 분석 결과가 어느 원문에서 나왔는지"를 파일 시스템만
  보고 바로 알 수 있게 한다.
- `docs/jd/` 바로 아래가 아니라 `analyzed/` 하위 폴더에 둬서, `docs/jd/*.txt`(원문)와
  `docs/jd/analyzed/*.json`(분석 결과)이 한 눈에, 실수로 섞이지 않게 구분된다.
- 여러 JD를 한 번에 분석했다면 `docs/jd/analyzed/batch-YYYYMMDD.json`처럼 묶어서 저장해도 되지만
  (이 스펙의 1장대로 배열이면 됨), 기본값은 "원문 1개 = JSON 파일 1개"를 권장한다 — 나중에 특정
  JD 하나만 다시 Import하거나 내용을 대조하기 쉽다.
