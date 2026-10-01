# docs/jd/ — JD 원문 Source of Truth

이 폴더는 채용공고(JD) **원문**을 영구 보관하는 곳이다. Career 기능의 전체 파이프라인에서 이 폴더가
맡는 역할은 딱 하나, "원본 보존"이다:

```
docs/jd/*.txt  →  Claude 분석  →  docs/jd/analyzed/*.json  →  JSON Import  →  IndexedDB
   (원문)        (Requirement/         (JdImportRow[])                      (실제 서비스 데이터,
                 Competency/Role 표준화)                                      Dashboard 즉시 반영)
```

- **docs/jd/\*.txt (여기)** — 사람이 직접 보관하는 원문. 회사명/공고명/직무명/URL/채용기간/고용형태/
  경력조건/근무지와 담당업무·자격요건·우대사항 원문만 담는다. **Requirement/Competency/Role 같은
  분석 결과는 절대 섞지 않는다** — 그건 다음 단계의 산출물이지 원본의 일부가 아니다. **한 번 저장한
  뒤에는 내용을 고치지 않는다** — 오타가 있어도 그 자체가 원본 기록이다.
- **Claude 분석** — 이후 별도 요청으로 진행하는 단계. Claude가 이 폴더의 `.txt`를 읽고
  `requirements[]`(rawText/sourceSection/competencies/roles)를 만들어낸다. 자동화된 스크립트가
  아니라 그때그때 요청하는 분석 작업이다. 최종 JSON 스키마와 저장 경로는
  [`docs/JD_IMPORT_SPEC.md`](../JD_IMPORT_SPEC.md) 참고 — 이 README는 TXT 포맷만 다룬다.
- **JSON** — `docs/JD_IMPORT_SPEC.md`에 정의된 `JdImportRow`/`JdImportRequirement` 스키마.
  **권장 저장 경로**: `docs/jd/analyzed/{원문과 같은 파일명}.json`
  (예: `docs/jd/원티드랩_DA_intern_202610.txt` → `docs/jd/analyzed/원티드랩_DA_intern_202610.json`).
- **IndexedDB** — 기존 Career JSON Import 화면으로 그대로 들어간다. 이 폴더와는 완전히 분리된 별도
  데이터다 — 여기 파일을 고친다고 앱 데이터가 바뀌지 않고, 앱에서 지운다고 이 파일이 지워지지 않는다.

## 파일명

`{회사}_{직무}.txt` — 예: `Toss_BusinessDataAnalyst.txt`

회사명/직무명의 띄어쓰기는 붙이거나 하이픈으로 바꾸되 일관되게 쓴다. 같은 회사+직무 공고를 다시
저장할 일이 있으면(재공고 등) 덮어쓰지 말고 `-2`, `-3`처럼 번호를 붙인다 — 각 파일은 그 자체로
하나의 역사적 원본이다.

## 포맷

`라벨: 값` 헤더 블록 → 빈 줄 → `[섹션]` 3개. 값을 모르면 라벨만 남기고 비워둔다(지어내지 않는다).

```
회사명: Toss
공고명: 2026년 상반기 신입/경력 공개채용
직무명: Business Data Analyst
URL: https://...
채용시작일: 2026-01-01
채용마감일: 2026-01-31
고용형태: 정규직
경력조건: 경력
근무지: 서울 강남구

[담당업무]
- ...

[자격요건]
- ...

[우대사항]
- ...
```

## 필드 ↔ 스키마 매핑

| TXT 라벨 | JobPosting 필드 | 허용값 |
|---|---|---|
| 회사명 | `companyName` | 자유 텍스트 |
| 공고명 | `postingTitle` | 자유 텍스트 |
| 직무명 | `positionTitle` | 자유 텍스트 |
| URL / JD URL | `jdUrl` | 선택 |
| 채용시작일 / 채용 시작일, 채용마감일 / 채용 마감일 | `applicationStartDate` / `applicationEndDate` | `YYYY-MM-DD`. 모르면 비워두거나(값 없음) "상시채용"처럼 자유 텍스트로 남겨도 된다 — 분석 단계에서 날짜로 못 바꾸면 그냥 비워서 Import한다. |
| 고용형태 | `employmentType` | 공고 문구를 그대로 적어도 된다(예: "단기인턴형 / 인턴 1년"). Import용 JSON을 만들 때 `src/features/career/jobPostingLabels.ts`의 5종(정규직/계약직/인턴/프리랜서/기타) 중 가장 가까운 값으로 분석 단계에서 판단한다 — 애매하면 비워둔다. |
| 경력조건 | `experienceLevel` | 위와 동일한 이유로 자유 텍스트 허용, Import 시 신입/경력/신입·경력 무관 중 하나로 판단. |
| 근무지 | `workLocation` | 자유 텍스트 |
| `[담당업무]` / `[자격요건]` / `[우대사항]` | `responsibilities` / `qualifications` / `preferredQualifications` | 섹션 본문 — `src/lib/jdTextParser.ts`의 `HEADER_KEYWORDS`가 이미 인식하는 것과 같은 한국어 헤더 |

라벨 띄어쓰기(`채용시작일`/`채용 시작일`)는 둘 다 쓸 수 있다 — 사람이 보기 편한 쪽으로 적는다.
`[담당업무]`/`[자격요건]`/`[우대사항]` 외에 `[포지션 소개]`, `[기타]`, `[원본 보존 메모]`처럼
참고용 섹션을 더 추가해도 된다 — 분석 단계에서 맥락 파악에 쓰고, Import JSON에는 반영되지 않는다.

## 향후: 여러 TXT를 한 번에 JSON으로 만들기 (설계만, 미구현)

두 단계로 나뉜다. 지금은 둘 다 구현돼 있지 않다 — 이 README가 그 설계다.

1. **기계적 추출 (분석 없음)**: `docs/jd/*.txt`는 라벨이 고정된 형식이라, 자유 텍스트 붙여넣기용
   `parseRawJdText`(`src/lib/jdTextParser.ts`)보다 훨씬 단순한 `라벨: 값` 파서로 충분하다. 향후
   `src/lib/jdTxtFile.ts`에 `parseJdTxtFile(text): JdImportRow`(`requirements: []`로 빈 채로)를
   만들고, `docs/jd/*.txt`를 모아 읽어 JSON 배열 하나로 묶어주는 Node 스크립트
   (`scripts/jdTxtToJson.ts`, 앱 번들과 무관한 수동 실행용)를 둘 수 있다. 고용형태/경력조건은
   `employmentTypeLabel`/`experienceLevelLabel`을 거꾸로(라벨→enum) 찾아 매핑한다 — 라벨 어휘가
   두 군데로 갈라지지 않는다.
2. **분석 보강 (자동화 대상 아님)**: Claude 세션에 `.txt`(또는 1단계가 만든 JSON 뼈대)를 주고
   `requirements[]`를 채우게 한다 — `rawText`는 섹션 본문을 그대로, 각 항목에 `sourceSection`과
   표준화된 `competencies`/`roles`를 붙인다. `employmentType`/`experienceLevel`처럼 TXT에 자유
   텍스트로 적혀 있을 수 있는 필드도 이 단계에서 5종/3종 enum 중 가장 가까운 값으로(애매하면
   비워서) 정리한다. 결과를 `docs/jd/analyzed/{원문과 같은 파일명}.json`에 저장하면 바로 앱의
   JSON Import 화면에 넣을 수 있는 `JdImportRow[]`다(스키마는 `docs/JD_IMPORT_SPEC.md`). 이 단계는
   스크립트가 아니라 그때그때의 요청으로 수행한다.
