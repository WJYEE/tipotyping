# TipoTyping Product Specification

## 1. Product Overview

TipoTyping은 취업 및 학습에 필요한 지식을 타자검정처럼 빠르게 직접 입력하며 반복 인출(Recall)하는 개인용 학습 웹앱이다.

단순 암기뿐 아니라 SQL/Python 코딩테스트, 데이터 분석, 금융, CS, AI, NCS, 인적성, 언어, 면접 등 다양한 지식을 하나의 개인 학습 공간에 축적하는 것을 목표로 한다.

### 기본 원칙

- 개인용 웹앱
- 로그인/회원가입 없음
- Desktop Web 우선
- 문제와 학습기록은 로컬 저장
- 서버 없이 IndexedDB 사용
- 전체 데이터 JSON Backup/Restore 지원
- 테마와 문제는 사용자가 자유롭게 추가/수정 가능
- 기본 문제 데이터도 제공
- 빠른 입력과 지식 인출이 핵심이며 일반 코딩테스트 플랫폼처럼 긴 문제 풀이를 지향하지 않음


## 2. Content Structure

콘텐츠 구조:

대분류(Category)
→ 하위테마(Theme)
→ 태그(Tag)
→ 문제(Question)

### 기본 대분류 / 하위테마

#### 코딩
- SQL
- Python
- 자료구조
- 알고리즘

#### 데이터
- 데이터분석
- 통계
- Product Analytics
- Business Analytics
- A/B Test
- 데이터 시각화

#### 금융
- 금융기초
- 은행
- 카드
- 핀테크·결제
- 신용·여신
- 투자·증권
- 금융규제

#### 비즈니스
- 이커머스
- 플랫폼
- 비즈니스모델
- KPI·지표
- 마케팅

#### CS·IT
- 데이터베이스
- 네트워크
- 운영체제
- API·Web
- Cloud
- Git

#### AI
- ML
- DL
- LLM
- RAG
- AI Agent
- AI 기초

#### 취업
- NCS
- 인적성
- 면접
- 직무지식

#### 언어
- 영어
- OPIc
- 일본어
- 스페인어

대분류와 하위테마는 초기값이며 사용자가 추가/수정할 수 있다.

Tag는 문제마다 복수 지정 가능하며 검색뿐 아니라 게임 출제 필터로 사용한다.

예:
코딩 > SQL > #JOIN #Subquery #WindowFunction


## 3. Question Types

총 6개 유형을 지원한다.

### 3.1 빈칸 블록

SQL/Python 코드 또는 문장의 일부를 빈칸으로 만든다.

- 단일/복수 빈칸 지원
- 기존 코드는 수정 불가
- 지정된 빈칸만 입력
- 복수 빈칸은 순서대로 풀이
- Enter로 현재 빈칸 제출
- 한 빈칸을 틀려도 정답 공개 후 나머지 빈칸 계속 풀이
- 빈칸 하나라도 틀리면 문제 전체 결과는 오답
- 문제 전체 결과 + 빈칸별 결과 모두 기록

### 3.2 정의 → 용어

정의를 보고 해당 용어를 직접 입력한다.

### 3.3 용어 → 정의

용어를 보고 정의를 직접 입력한다.

### 3.4 정답 입력

예:
- Python 실행 결과
- SQL 결과
- 계산 결과
- 짧은 답

### 3.5 객관식

NCS, 인적성, CS 등에 사용한다.

- 숫자키로 선택 가능
- 숫자키 입력 즉시 제출
- 마우스 선택도 즉시 제출

### 3.6 서술형

개념, 원리, 비교, 면접 답변 등을 직접 작성한다.

- multiline 입력
- Enter = 줄바꿈
- Space = 일반 입력
- Ctrl + Enter = 제출
- 제출 버튼도 제공


## 4. Answer Evaluation

MVP에서는 모든 문제를 다음 두 상태로만 판정한다.

- 정답
- 오답

부분정답은 없다.

텍스트 정답은 완전 Exact Match를 사용한다.

대소문자, 공백, 문장부호 등을 포함해 저장된 정답과 정확히 일치해야 한다.

향후 채점 완화 가능성을 고려하되 MVP에서는 구현하지 않는다.


## 5. Learning Session Flow

기존 1/3/5/10분 제한시간 방식은 사용하지 않는다.

게임 시작 후 사용자가 원하는 만큼 자유롭게 학습한다.

Flow:

테마 선택
→ 문제 유형 선택
→ 필터/출제방식 설정
→ START
→ 문제 풀이
→ 정답/오답 Feedback
→ 다음 문제
→ 사용자가 학습 종료
→ Result

### 학습시간

Countdown이 아닌 실제 학습시간을 측정한다.

- START 시 측정 시작
- Pause 가능
- Pause 중 시간 제외
- Resume 시 이어서 측정
- 10초 이상 학습한 Session만 기록

### 종료

두 방법 모두 지원한다.

- 학습 종료 버튼
- ESC

ESC 또는 종료 버튼 사용 시 종료 확인 후 Result로 이동한다.

문제 수 제한은 없다.


## 6. Question Selection

### 복수 테마

여러 대분류/하위테마를 동시에 선택할 수 있다.

대분류 전체 선택도 가능하다.

예:
금융 전체 + Product Analytics + SQL

복수 테마 선택 시 각 테마에서 균등하게 출제한다.

### 문제 유형

6개 유형 중 복수 선택 가능.

선택한 문제 유형끼리 균등하게 섞는다.

전체 선택/전체 해제를 지원한다.

### 난이도

난이도는 선택 속성이다.

- 초급
- 중급
- 고급

SQL/Python/알고리즘 등 난이도가 의미 있는 테마에서만 사용한다.

개념 학습 등 필요 없는 테마에서는 난이도를 사용하지 않는다.

테마별로 난이도 사용 여부를 설정할 수 있도록 설계한다.

### 출제 모드

4개 모드:

1. 순서대로
2. 랜덤
3. 새 문제 우선
4. 오답 우선

순서대로:
- 문제 등록순

랜덤:
- 선택 범위 내 무작위 출제

새 문제 우선:
- 한 번도 풀지 않은 문제를 먼저 출제

오답 우선:
- 가장 최근 풀이 결과가 오답인 문제를 우선 출제

한 사이클 내에서는 동일 문제를 중복 출제하지 않는다.

선택된 문제를 모두 소진하면 새로운 사이클을 시작하여 계속 학습할 수 있다.


## 7. Answer Feedback

답 제출 후:

정답 또는 오답
→ 실제 정답
→ 해설이 존재하면 해설
→ 다음 문제

해설(explanation)은 선택 속성이다.

- 해설 있음: 정답 + 해설 표시
- 해설 없음: 정답만 표시

Feedback 화면에서 Enter를 누르면 즉시 다음 문제로 넘어간다.

따라서 해설을 읽고 싶으면 머물 수 있고, 필요 없으면 Enter로 빠르게 Skip 가능하다.

오답 발생 시 해당 문제에서 재입력하지 않는다.


## 8. Skip / Flag / Favorite / Memo

### Skip

모르는 문제는 Skip 가능하다.

### 문제 오류 표시

학습 중 잘못된 문제를 발견하면 즉시 Flag할 수 있다.

Question Management에서 이후 확인/수정할 수 있도록 한다.

### Favorite

중요 문제에 ⭐ 표시 가능.

### Personal Memo

문제마다 개인 메모를 작성할 수 있다.


## 9. Learning Records

Game Session 기록과 Question별 학습 기록을 분리한다.

### Session Record

예:
- 학습시간
- 선택 테마
- 선택 태그
- 문제 유형
- 출제 모드
- 총 시도 수
- 정답 수
- 오답 수
- 정확도
- 풀이 상세

동일 문제를 한 Session에서 여러 번 풀었다면 모든 시도를 Session 성적에 반영한다.

### Question Learning Record

문제별로:
- 누적 시도
- 누적 정답/오답
- 최근 결과
- 마지막 풀이 시점
등 필요한 학습 데이터를 저장한다.

빈칸 문제는 빈칸별 결과도 저장한다.


## 10. Result / Review

Result 화면:

- 실제 학습시간
- 풀이 수
- 정답
- 오답
- 정확도

오답 상세:
- 문제
- 내 답
- 실제 정답
- 해설(존재 시)

기능:
- 다시 학습
- 이번 Session 오답만 다시 풀기
- 다른 테마 선택
- 홈

### 오답 복습 구분

Result의 "이번 Session 오답 다시 풀기"
= 방금 학습에서 틀린 문제만 출제

Game Setup의 "오답 우선"
= 누적 기록에서 최근 결과가 오답인 문제를 우선 출제


## 11. Dashboard / Records

Dashboard는 누적 학습 중심으로 구성한다.

주요 분석 단위:

- 대분류
- 하위테마
- Tag

표시 가능한 주요 지표:
- 누적 학습시간
- 누적 풀이 수
- 정답/오답
- 정확도
- Category별 기록
- Theme별 기록
- Tag별 기록
- 최근 Session

개별 문제 통계를 메인 Dashboard에서 강조하지 않는다.

Category/Theme/Tag 상세 화면으로 들어가면:
- 어떤 문제를 풀었는지
- 문제별 최근 결과
- 풀이 기록
등을 확인할 수 있다.

기록 초기화 기능을 제공한다.


## 12. Question Management

기능:
- 문제 추가
- 수정
- 삭제
- 검색
- Category 필터
- Theme 필터
- Tag 필터
- 문제 유형 필터
- Flag 문제 확인
- Favorite 확인

### 문제 수정

수정 시 기존 학습 기록 처리 선택:

- 유지
- 초기화

기본값은 유지.

### 문제 삭제

문제 삭제는 해당 문제에 문제가 있다고 판단한 것으로 간주한다.

삭제 시:
- Question 삭제
- Question 학습 기록 삭제
- 관련 상세 Attempt 기록 삭제

관련 Session 통계도 데이터 일관성을 유지하도록 처리한다.


## 13. Bulk Import

개별 문제 추가뿐 아니라 대량 Import를 지원한다.

지원:
- JSON (기본 권장)
- CSV

향후 Claude 등을 이용하여 정해진 Schema에 맞는 문제 데이터를 대량 생성하고 Import할 수 있어야 한다.

중복 처리:
- 동일 ID → Skip
- 동일 문제 → Skip

중복 문제는 새로 저장하지 않는다.


## 14. Default Content

첫 실행부터 기본 Category/Theme 및 기본 문제를 제공한다.

기본 문제는 SQL/Python 코딩테스트, 데이터, 금융, CS/IT 등 각 분야의 학습에 실제 도움이 되는 내용으로 구성한다.

외부 사이트의 문제를 그대로 복제하는 방식은 사용하지 않는다.

공식 문서, 공개 학습자료, 코딩 문제 유형 등을 참고해:
1. 핵심 지식/출제 포인트 파악
2. TipoTyping에 적합한 짧은 자체 문제 생성
3. 내용 검증
4. 기본 데이터로 포함

방식으로 구축한다.


## 15. Local Data / Backup

로그인 및 서버 DB를 사용하지 않는다.

주 저장소:
- IndexedDB

사용자 데이터 전체 Backup/Restore를 지원한다.

Backup 대상:
- Category
- Theme
- Questions
- Tags
- 학습 기록
- Session
- Attempts
- Favorite
- Memo
- 기타 사용자 설정

JSON 전체 Export/Import를 기본 Backup 방식으로 사용한다.

브라우저 데이터 삭제 또는 기기 변경에 대비한다.


## 16. UI / Figma

현재 Figma Design을 UI Source of Truth로 사용한다.

Claude Code는 Figma MCP를 통해 디자인 구조를 읽는다.

현재 확인된 주요 화면:
- home-dashboard
- theme-selection
- game-setup
- game-typing
- result-screen
- question-management
- records-history

UI 기본 방향:
- 둥근 형태
- 컬러풀
- 귀여운 게임형 디자인
- Neo-brutalism 계열 border/shadow
- Desktop Web 우선
- 게임 화면에서는 입력과 문제에 집중

Figma의 하드코딩된 색상/폰트/spacing 값은 구현 시 Design Token으로 정리한다.

Figma의 1280px Frame 크기를 실제 웹의 고정 width로 그대로 사용하지 않고 적절한 responsive/max-width 구조로 구현한다.

진행률/완료율 기반 UI는 사용하지 않는다.


## 17. Technical Design Policy

다음 사항은 Product 요구사항을 기준으로 Claude Code가 적절한 설계안을 제안한다.

- IndexedDB Schema
- Entity 관계
- IndexedDB Library 선택
- React/Next.js 등 Frontend Stack
- 상태관리 방식
- Component 구조
- 폴더 구조
- Design Token 구조
- Import/Export 구현
- 데이터 Migration 전략
- 테스트 전략
- 배포 방식

중요:

Claude Code는 기술 선택을 임의로 바로 구현하지 않는다.

반드시 먼저:
1. 현재 PRODUCT_SPEC.md 읽기
2. Figma MCP 분석 결과 확인
3. 기술 설계안 제안
4. 선택 이유와 Trade-off 설명
5. 구현 순서 제안

을 수행한 뒤 승인받고 구현을 시작한다.


## 18. Development Principle

한 번에 전체 서비스를 생성하지 않는다.

기능을 작은 단위로 나누어:

설계
→ 확인
→ 구현
→ 테스트
→ Commit
→ 다음 기능

순서로 진행한다.

각 구현 단계에서 개발자가 코드와 구조를 이해할 수 있도록 변경 이유를 설명한다.