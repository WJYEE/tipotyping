# docs/jd/ — JD 원문 Source of Truth

이 폴더는 채용공고(JD) **원문**을 영구 보관하는 곳이다. Career 기능의 전체 파이프라인에서 이 폴더가
맡는 역할은 딱 하나, "원본 보존"이다:

```
docs/jd/*.txt  →  Claude 분석  →  JSON (Career Import schema)  →  IndexedDB
   (원문)        (Requirement/            (JdImportRow[])        (실제 서비스 데이터)
                 Competency/Role 표준화)
```

- **docs/jd/\*.txt (여기)** — 사람이 직접 보관하는 원문. 회사명/공고명/직무명/URL/채용기간/고용형태/
  경력조건/근무지와 담당업무·자격요건·우대사항 원문만 담는다. **Requirement/Competency/Role 같은
  분석 결과는 절대 섞지 않는다** — 그건 다음 단계의 산출물이지 원본의 일부가 아니다.
- **Claude 분석** — 이후 별도 요청으로 진행하는 단계. Claude가 이 폴더의 `.txt`를 읽고
  `requirements[]`(rawText/sourceSection/competencies/roles)를 만들어낸다. 자동화된 스크립트가
  아니라 그때그때 요청하는 분석 작업이다.
- **JSON** — `src/lib/importJobPostings.ts`의 기존 `JdImportRow`/`JdImportRequirement` 스키마 그대로.
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
| URL | `jdUrl` | 선택 |
| 채용시작일 / 채용마감일 | `applicationStartDate` / `applicationEndDate` | `YYYY-MM-DD` |
| 고용형태 | `employmentType` | `src/features/career/jobPostingLabels.ts`의 `employmentTypeLabel` 중 하나 (정규직/계약직/인턴/프리랜서/기타) |
| 경력조건 | `experienceLevel` | 같은 파일의 `experienceLevelLabel` 중 하나 (신입/경력/신입·경력 무관) |
| 근무지 | `workLocation` | 자유 텍스트 |
| `[담당업무]` / `[자격요건]` / `[우대사항]` | `responsibilities` / `qualifications` / `preferredQualifications` | 섹션 본문 — `src/lib/jdTextParser.ts`의 `HEADER_KEYWORDS`가 이미 인식하는 것과 같은 한국어 헤더 |

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
   표준화된 `competencies`/`roles`를 붙인다. 결과가 바로 앱의 JSON Import 화면에 넣을 수 있는
   `JdImportRow[]`다. 이 단계는 스크립트가 아니라 그때그때의 요청으로 수행한다.
