# Question Import JSON Spec

외부에서 Theme별 문제은행 JSON을 만들어 TipoTyping에 Import하기 위한 정확한 스펙이다.
이 문서는 **현재 구현된 코드의 동작을 그대로 설명**한 것이며, 스펙과 코드가 다르면 코드가 맞다.

관련 코드:
- 파싱/Import: `src/lib/importQuestions.ts`
- Export(동일 포맷 역방향): `src/lib/exportQuestions.ts`
- Question 타입: `src/types/domain.ts`
- displayCode 발급 규칙: `src/lib/displayCode.ts`
- 채점(Exact Match): `src/lib/evaluateAnswer.ts`

## 1. 최상위 구조

JSON 파일은 **문제(ImportRow) 객체의 배열**이다. 감싸는 객체(`{ "questions": [...] }` 등) 없이 바로 배열이어야 한다.

```json
[
  { "categoryName": "...", "themeName": "...", "type": "...", "payload": { ... } },
  { "categoryName": "...", "themeName": "...", "type": "...", "payload": { ... } }
]
```

배열이 아니면 파싱 단계(`parseImportJson`)에서 즉시 에러를 던지고 Import가 중단된다.

(CSV도 지원하지만 이 문서는 JSON 문제은행 제작을 기준으로 한다. CSV 컬럼 규칙은
`parseImportCsv` 주석 참고.)

## 2. 문제 1개(ImportRow)의 필드

```ts
{
  id?: string;             // 선택. 보통 비워둔다 (아래 3장 참고)
  displayCode?: string;    // 선택. 보통 비워둔다 (아래 5장 참고)
  categoryName: string;    // 필수
  themeName: string;       // 필수
  type: QuestionType;      // 필수. 6종 중 하나
  difficulty?: "beginner" | "intermediate" | "advanced"; // 선택
  tags?: string[];         // 선택
  explanation?: string;    // 선택
  favorite?: boolean;      // 선택, 기본 false
  flagged?: boolean;       // 선택, 기본 false
  memo?: string;           // 선택
  payload: { ... };        // 필수. type별 구조는 4장 참고
}
```

| 필드 | 필수 | 규칙 |
|---|---|---|
| `categoryName` | O | **기존 Category 이름과 정확히 일치**해야 한다. 대소문자/공백까지 완전 일치(`===`) 비교. 없으면 자동 생성하지 않고 해당 행을 error 처리한다. |
| `themeName` | O | `categoryName`으로 찾은 Category 안에서 **기존 Theme 이름과 정확히 일치**해야 한다. 없으면 error. |
| `type` | O | 6종 QuestionType 중 하나. 검증 없이 그대로 저장되므로 오타가 있으면 앱에서 알 수 없는 유형으로 취급된다. |
| `difficulty` | 선택 | Theme의 `useDifficulty`가 true인 Theme(코딩 계열: SQL/Python/자료구조/알고리즘)에만 의미가 있다. **Import 로직 자체는 강제하지 않는다** — 값을 넣든 안 넣든 그대로 저장된다. useDifficulty=false인 Theme에 difficulty를 넣어도 막지 않지만, UI(문제 편집 화면)는 해당 Theme에서 난이도 필드를 숨기므로 넣지 않는 것을 권장한다. |
| `tags` | 선택 | 문자열 배열. **이름이 같은 Tag가 없으면 자동 생성**한다(`tagRepo.getOrCreate`). Category/Theme과 달리 사전 등록 불필요. |
| `payload` | O | 비어 있으면(`undefined`/falsy) error 처리. 내부 구조는 **런타임 검증 없이 그대로 저장**되므로 4장 구조를 반드시 지켜야 한다. |

## 3. `id` 규칙

- 비워두면 Import 시 `crypto.randomUUID()`로 새로 발급된다. **외부 문제은행 제작 시 기본값으로 비워두는 것을 권장**한다.
- 값을 채우면 재-import(동기화) 시 "동일 ID → Skip" 판정에 쓰인다. 기존 DB에 같은 `id`를 가진 Question이 있으면 그 행은 무조건 `skipped`로 처리되고 내용 비교조차 하지 않는다.
- 같은 문제은행을 버전업해서 재배포할 계획이면, 문제별로 고정된 `id`(예: UUID를 한 번 생성해 고정)를 부여해 재-import 시 중복 추가를 막을 수 있다.

## 4. 중복 판정 기준 (Import 시)

`importQuestions`는 두 단계로 중복을 판정하며, **둘 중 하나라도 걸리면 `skipped`로 세고 저장하지 않는다** (에러 아님):

1. **동일 `id`**: 행에 `id`가 있고, 그 `id`를 가진 Question이 이미 DB에 있으면 skip. (내용은 비교하지 않음)
2. **동일 시그니처**: `id`가 없거나 안 겹쳐도, `themeId + type + JSON.stringify(payload)`가 완전히 같은 기존 Question이 있으면 skip.
   - `payload` 내부 **키 순서까지 같아야** 같은 문자열이 된다 (`JSON.stringify` 비교이므로). 같은 내용이라도 키 순서가 다르면 다른 문제로 취급되어 중복으로 걸러지지 않을 수 있다 — 문제은행 생성기는 payload의 키 순서를 안정적으로(예: 항상 같은 순서로 직렬화) 유지해야 한다.
   - `themeId`가 다르면(= 같은 문제를 다른 Theme에 넣으면) 중복으로 보지 않는다.

카테고리/테마를 못 찾거나 `payload`가 비어 있으면 `errors`에 `{ row, reason }`으로 기록되고 저장되지 않는다 (skip과 구분됨).

## 5. `displayCode` 처리 규칙

- **보통 비워둔다.** 비우면 Theme에 맞는 접두어 + 그 Theme 안에서 다음 순번으로 자동 발급된다 (예: `SQL-0007`).
- 값을 채우면(예: 이전 export를 재-import) **같은 Theme 안에서 아직 안 쓰인 코드일 때만 그대로 유지**된다. 이미 같은 Theme의 다른 Question이 그 코드를 쓰고 있으면 조용히 무시되고 새 코드가 자동 발급된다 (에러 아님, `errors`/`skipped`에도 안 잡힘 — 그냥 다른 코드로 저장됨).
- `displayCode`는 **Theme 내부에서만 유일**하면 되고, 생성 후에는 고정 식별자라 Question 수정으로는 바뀌지 않는다.
- 접두어 규칙 (문제은행 제작자가 직접 코드를 지정하려는 경우에만 참고):
  - 기본 제공 42개 Theme은 **고정 접두어**를 쓴다 (아래 표).
  - 사용자가 직접 만든 Theme(사용자 정의 Theme)은 Theme 이름의 ASCII 영숫자(최대 8자, 대문자화)를 접두어로 쓰고, ASCII가 전혀 없으면(순한글 이름 등) `CUSTOM`을 쓴다. 다른 Theme과 접두어가 겹치면 `CUSTOM2`, `CUSTOM3`...처럼 숫자를 붙여 피한다.
  - 포맷은 `PREFIX-0001`처럼 하이픈 + 4자리 0-padding 번호.

### 기본 제공 Category / Theme / displayCode 접두어

| Category | Theme | 접두어 | useDifficulty |
|---|---|---|---|
| 코딩 | SQL | `SQL` | true |
| 코딩 | Python | `PY` | true |
| 코딩 | 자료구조 | `DS` | true |
| 코딩 | 알고리즘 | `ALGO` | true |
| 데이터 | 데이터분석 | `DA` | false |
| 데이터 | 통계 | `STAT` | false |
| 데이터 | Product Analytics | `PA` | false |
| 데이터 | Business Analytics | `BA` | false |
| 데이터 | A/B Test | `AB` | false |
| 데이터 | 데이터 시각화 | `DV` | false |
| 금융 | 금융기초 | `FIN` | false |
| 금융 | 은행 | `BANK` | false |
| 금융 | 카드 | `CARD` | false |
| 금융 | 핀테크·결제 | `PAY` | false |
| 금융 | 신용·여신 | `CREDIT` | false |
| 금융 | 투자·증권 | `INVEST` | false |
| 금융 | 금융규제 | `FINREG` | false |
| 비즈니스 | 이커머스 | `ECOM` | false |
| 비즈니스 | 플랫폼 | `PLAT` | false |
| 비즈니스 | 비즈니스모델 | `BIZ` | false |
| 비즈니스 | KPI·지표 | `KPI` | false |
| 비즈니스 | 마케팅 | `MKT` | false |
| CS·IT | 데이터베이스 | `DB` | false |
| CS·IT | 네트워크 | `NET` | false |
| CS·IT | 운영체제 | `OS` | false |
| CS·IT | API·Web | `API` | false |
| CS·IT | Cloud | `CLOUD` | false |
| CS·IT | Git | `GIT` | false |
| AI | ML | `ML` | false |
| AI | DL | `DL` | false |
| AI | LLM | `LLM` | false |
| AI | RAG | `RAG` | false |
| AI | AI Agent | `AGENT` | false |
| AI | AI 기초 | `AIBASIC` | false |
| 취업 | NCS | `NCS` | false |
| 취업 | 인적성 | `APTI` | false |
| 취업 | 면접 | `INTV` | false |
| 취업 | 직무지식 | `JOB` | false |
| 언어 | 영어 | `ENG` | false |
| 언어 | OPIc | `OPIC` | false |
| 언어 | 일본어 | `JPN` | false |
| 언어 | 스페인어 | `ESP` | false |

이 Category/Theme은 사용자가 이름을 바꾸거나 삭제할 수 있는 초기 시드 데이터이므로, 대상 환경에
정확히 이 이름의 Category/Theme이 존재해야 `categoryName`/`themeName` 매칭이 된다. 확실하지 않으면
Import 전에 앱의 Theme 관리 화면에서 실제 이름을 확인한다.

## 6. Exact Match 저장 규칙 (채점 기준)

MVP는 모든 문제를 **Exact Match**(`a === b`, 대소문자/공백/문장부호 포함 완전 일치)로만 채점한다
(`src/lib/evaluateAnswer.ts`). 복수 정답, 대소문자 무시, trim 같은 유연한 채점은 없다. 따라서
payload에 넣는 정답 문자열은:

- 사용자가 실제로 타이핑할 **정확한 문자열 그대로** 넣는다 (앞뒤 공백 없이, 의도한 대소문자 그대로).
- "정답 후보가 여러 개"인 문제는 지원하지 않는다. 하나의 정답 문자열만 가능하다.
- `multiple-choice`만 예외로, 정답은 문자열이 아니라 `correctIndex`(0-based 숫자)로 비교한다.

## 7. Type별 payload 구조와 예시

공통 필드(`categoryName`, `themeName`, `type`, `payload` 등)는 생략하고 `payload`만 표로 정리한다.

### 7.1 `blank` — 빈칸 채우기

```ts
payload: {
  template: string;                              // {{blankId}} 토큰을 포함한 원본 코드/문장
  blanks: { id: string; answer: string }[];       // template의 {{id}}와 1:1 대응
}
```

- `template` 안의 `{{...}}` 토큰 개수/순서와 `blanks[].id`가 정확히 일치해야 한다 (화면에서 `{{blankId}}` 순서대로 입력칸을 만든다).
- `blanks[].id`에 쓰이지 않는 토큰이 있거나 반대로 토큰 없는 `blanks` 항목이 있으면 해당 빈칸은 렌더링/채점이 안 맞을 수 있다 — Import가 검증해주지 않으므로 생성기 쪽에서 보장해야 한다.

```json
{
  "categoryName": "코딩",
  "themeName": "SQL",
  "type": "blank",
  "difficulty": "beginner",
  "tags": ["SELECT"],
  "payload": {
    "template": "{{b1}} name FROM users WHERE age {{b2}} 18;",
    "blanks": [
      { "id": "b1", "answer": "SELECT" },
      { "id": "b2", "answer": ">" }
    ]
  }
}
```

### 7.2 `term-to-def` — 용어 → 정의 입력

```ts
payload: { term: string; definition: string }
```

사용자에게 `term`을 보여주고 `definition`을 입력받아 채점한다.

```json
{
  "categoryName": "CS·IT",
  "themeName": "네트워크",
  "type": "term-to-def",
  "payload": { "term": "TCP", "definition": "연결 지향형 전송 계층 프로토콜" }
}
```

### 7.3 `def-to-term` — 정의 → 용어 입력

```ts
payload: { term: string; definition: string }
```

`term-to-def`와 **동일한 payload 타입**(`TermDefPayload`)이지만, 화면에는 `definition`을 보여주고
`term`을 입력받아 채점한다 (`type`만 다르다).

```json
{
  "categoryName": "CS·IT",
  "themeName": "네트워크",
  "type": "def-to-term",
  "payload": { "term": "TCP", "definition": "연결 지향형 전송 계층 프로토콜" }
}
```

### 7.4 `answer-input` — 일반 질문-답 입력

```ts
payload: { prompt: string; answer: string }
```

```json
{
  "categoryName": "금융",
  "themeName": "금융기초",
  "type": "answer-input",
  "payload": { "prompt": "예금자보호법상 1인당 보호 한도는?", "answer": "5000만원" }
}
```

### 7.5 `multiple-choice` — 객관식

```ts
payload: {
  prompt: string;
  options: string[];
  correctIndex: number;  // options의 0-based 인덱스
}
```

- `correctIndex`는 `options.length` 범위 안이어야 한다 (벗어나도 Import는 막지 않지만 채점이 항상 틀리게 나온다).
- 정답은 텍스트로 중복 저장하지 않고 인덱스로만 가진다.

```json
{
  "categoryName": "AI",
  "themeName": "ML",
  "type": "multiple-choice",
  "payload": {
    "prompt": "과적합(overfitting)을 줄이는 방법이 아닌 것은?",
    "options": ["정규화(regularization)", "드롭아웃", "학습률을 0으로 고정", "데이터 증강"],
    "correctIndex": 2
  }
}
```

### 7.6 `essay` — 서술형 (MVP는 Exact Match)

```ts
payload: { prompt: string; answer: string }
```

이름은 "서술형"이지만 MVP 채점은 다른 유형과 동일하게 `answer` 전체 문자열과 완전 일치해야
정답 처리된다. 길고 자유로운 서술 답안을 받되 부분 채점/유사도 채점은 지원하지 않으므로,
사용자가 토씨까지 똑같이 타이핑할 만큼 answer를 짧고 명확하게 쓰는 것을 권장한다.

```json
{
  "categoryName": "비즈니스",
  "themeName": "비즈니스모델",
  "type": "essay",
  "payload": {
    "prompt": "프리미엄(Freemium) 모델의 핵심 아이디어를 한 문장으로 설명하라.",
    "answer": "기본 기능은 무료로 제공하고 고급 기능에만 과금하여 넓은 사용자 기반에서 일부를 유료 전환시키는 모델이다."
  }
}
```

## 8. 여러 문제를 담은 전체 예시

```json
[
  {
    "categoryName": "코딩",
    "themeName": "SQL",
    "type": "blank",
    "difficulty": "beginner",
    "tags": ["SELECT", "WHERE"],
    "explanation": "기본 SELECT 문법",
    "payload": {
      "template": "{{b1}} name FROM users WHERE age {{b2}} 18;",
      "blanks": [
        { "id": "b1", "answer": "SELECT" },
        { "id": "b2", "answer": ">" }
      ]
    }
  },
  {
    "categoryName": "CS·IT",
    "themeName": "네트워크",
    "type": "term-to-def",
    "payload": { "term": "TCP", "definition": "연결 지향형 전송 계층 프로토콜" }
  },
  {
    "categoryName": "AI",
    "themeName": "ML",
    "type": "multiple-choice",
    "payload": {
      "prompt": "과적합을 줄이는 방법이 아닌 것은?",
      "options": ["정규화", "드롭아웃", "학습률을 0으로 고정", "데이터 증강"],
      "correctIndex": 2
    }
  }
]
```

이 배열을 그대로 `.json` 파일로 저장해 Question Management 화면의 "JSON/CSV 가져오기"로
업로드하면 된다 (`src/features/question-management/ImportPanel.tsx`).
