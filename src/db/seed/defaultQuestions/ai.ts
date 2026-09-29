// AI: ML / DL / LLM / RAG / AI Agent / AI 기초
import type { SeedQuestion } from "@/db/seed/seedTypes";

export const aiQuestions: SeedQuestion[] = [
  // ───────────── ML ─────────────
  {
    themeName: "ML",
    type: "term-to-def",
    tagNames: ["ML"],
    payload: { term: "오버피팅", definition: "모델이 학습 데이터에 지나치게 맞춰져 새로운 데이터에 일반화하지 못하는 현상" },
  },
  {
    themeName: "ML",
    type: "def-to-term",
    tagNames: ["ML"],
    payload: { term: "교차검증", definition: "데이터를 여러 폴드로 나눠 반복 학습·평가해 모델 성능을 검증하는 기법" },
  },
  {
    themeName: "ML",
    type: "multiple-choice",
    tagNames: ["ML"],
    explanation: "레이블 없는 데이터에서 스스로 패턴이나 군집을 찾는 방식은 비지도학습이다.",
    payload: {
      prompt: "레이블 없는 데이터에서 패턴을 찾는 학습 방식은?",
      options: ["지도학습", "비지도학습", "강화학습", "전이학습"],
      correctIndex: 1,
    },
  },
  {
    themeName: "ML",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["ML"],
    payload: { term: "언더피팅", definition: "모델이 너무 단순해 학습 데이터의 패턴조차 제대로 학습하지 못하는 현상" },
  },
  {
    themeName: "ML",
    type: "term-to-def",
    difficulty: "intermediate",
    tagNames: ["ML"],
    payload: { term: "정밀도(Precision)", definition: "양성으로 예측한 것 중 실제로 양성인 비율" },
  },
  {
    themeName: "ML",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["ML"],
    payload: { term: "재현율(Recall)", definition: "실제 양성 중 모델이 양성으로 맞게 예측한 비율" },
  },
  {
    themeName: "ML",
    type: "essay",
    difficulty: "advanced",
    tagNames: ["ML"],
    payload: {
      prompt: "정밀도와 재현율이 서로 trade-off 관계에 놓이는 이유를 한 문장으로 설명하시오.",
      answer: "양성으로 예측하는 기준을 낮추면 재현율은 오르지만 잘못된 양성 예측도 늘어 정밀도가 떨어지기 때문이다.",
    },
  },
  {
    themeName: "ML",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["ML"],
    payload: { term: "특성 스케일링", definition: "변수 간 값의 범위 차이가 모델 학습에 미치는 영향을 줄이기 위해 크기를 맞추는 전처리" },
  },
  {
    themeName: "ML",
    type: "term-to-def",
    difficulty: "advanced",
    tagNames: ["ML"],
    payload: { term: "앙상블", definition: "여러 개의 모델을 결합해 단일 모델보다 더 안정적이고 정확한 예측을 만드는 기법" },
  },
  {
    themeName: "ML",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["ML"],
    payload: { term: "랜덤 포레스트", definition: "여러 개의 의사결정나무를 무작위로 만들어 결과를 종합하는 대표적인 앙상블 기법" },
  },
  {
    themeName: "ML",
    type: "term-to-def",
    difficulty: "intermediate",
    tagNames: ["ML"],
    payload: { term: "하이퍼파라미터", definition: "학습 전에 사람이 직접 설정해야 하는, 데이터로부터 학습되지 않는 모델 설정값" },
  },

  // ───────────── DL ─────────────
  {
    themeName: "DL",
    type: "term-to-def",
    tagNames: ["DL"],
    payload: { term: "역전파", definition: "출력의 오차를 신경망 전체로 거꾸로 전달해 가중치를 갱신하는 학습 알고리즘" },
  },
  {
    themeName: "DL",
    type: "def-to-term",
    tagNames: ["DL"],
    payload: { term: "드롭아웃", definition: "학습 시 일부 뉴런을 무작위로 비활성화해 과적합을 줄이는 정규화 기법" },
  },
  {
    themeName: "DL",
    type: "term-to-def",
    tagNames: ["DL"],
    payload: { term: "활성화 함수", definition: "신경망에 비선형성을 부여해 복잡한 패턴을 학습할 수 있게 하는 함수" },
  },
  {
    themeName: "DL",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["DL"],
    payload: { term: "CNN", definition: "이미지의 지역적 패턴을 필터로 추출하는 데 특화된 합성곱 신경망" },
  },
  {
    themeName: "DL",
    type: "term-to-def",
    difficulty: "intermediate",
    tagNames: ["DL"],
    payload: { term: "RNN", definition: "이전 시점의 출력을 다음 시점 입력에 함께 사용해 순차 데이터를 처리하는 신경망" },
  },
  {
    themeName: "DL",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["DL"],
    payload: { term: "기울기 소실", definition: "신경망 층이 깊어질수록 역전파되는 기울기가 점점 작아져 학습이 잘 되지 않는 문제" },
  },
  {
    themeName: "DL",
    type: "term-to-def",
    difficulty: "advanced",
    tagNames: ["DL"],
    payload: { term: "배치 정규화", definition: "각 층의 입력 분포를 정규화해 학습을 안정시키고 속도를 높이는 기법" },
  },
  {
    themeName: "DL",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["DL"],
    payload: { term: "옵티마이저", definition: "손실을 줄이는 방향으로 가중치를 어떻게 갱신할지 결정하는 학습 알고리즘(예: Adam)" },
  },
  {
    themeName: "DL",
    type: "term-to-def",
    difficulty: "intermediate",
    tagNames: ["DL"],
    payload: { term: "손실 함수", definition: "모델의 예측이 실제 정답과 얼마나 차이 나는지를 수치로 나타내는 함수" },
  },

  // ───────────── LLM ─────────────
  {
    themeName: "LLM",
    type: "term-to-def",
    tagNames: ["LLM"],
    payload: { term: "토큰", definition: "언어 모델이 텍스트를 처리하는 최소 단위 조각" },
  },
  {
    themeName: "LLM",
    type: "def-to-term",
    tagNames: ["LLM"],
    payload: { term: "프롬프트", definition: "언어 모델에게 원하는 응답을 얻기 위해 입력하는 지시문이나 질문" },
  },
  {
    themeName: "LLM",
    type: "term-to-def",
    tagNames: ["LLM"],
    payload: { term: "환각", definition: "모델이 사실이 아닌 내용을 그럴듯하게 생성해내는 현상" },
  },
  {
    themeName: "LLM",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["LLM"],
    payload: { term: "트랜스포머", definition: "어텐션 메커니즘을 기반으로 순차 처리 없이 문맥을 병렬로 학습하는 신경망 구조" },
  },
  {
    themeName: "LLM",
    type: "term-to-def",
    difficulty: "intermediate",
    tagNames: ["LLM"],
    payload: { term: "어텐션", definition: "입력의 각 부분이 출력에 얼마나 중요한지 가중치를 계산해 반영하는 메커니즘" },
  },
  {
    themeName: "LLM",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["LLM"],
    payload: { term: "파인튜닝", definition: "사전 학습된 모델을 특정 작업이나 도메인 데이터로 추가 학습시키는 과정" },
  },
  {
    themeName: "LLM",
    type: "essay",
    difficulty: "advanced",
    tagNames: ["LLM"],
    payload: {
      prompt: "LLM의 환각 현상이 발생하는 근본적인 이유를 한 문장으로 설명하시오.",
      answer: "모델이 사실을 검색해 답하는 것이 아니라 학습한 확률 분포상 그럴듯한 다음 단어를 생성하는 방식으로 동작하기 때문이다.",
    },
  },
  {
    themeName: "LLM",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["LLM"],
    payload: { term: "컨텍스트 윈도우", definition: "모델이 한 번에 참고할 수 있는 입력 토큰의 최대 길이" },
  },
  {
    themeName: "LLM",
    type: "term-to-def",
    difficulty: "advanced",
    tagNames: ["LLM"],
    payload: { term: "제로샷 학습", definition: "해당 작업에 대한 예시를 전혀 주지 않고도 모델이 수행하도록 하는 방식" },
  },

  // ───────────── RAG ─────────────
  {
    themeName: "RAG",
    type: "term-to-def",
    tagNames: ["RAG"],
    payload: { term: "RAG", definition: "외부 지식을 검색해 프롬프트에 포함시킨 뒤 답변을 생성하는 방식" },
  },
  {
    themeName: "RAG",
    type: "def-to-term",
    tagNames: ["RAG"],
    payload: { term: "임베딩", definition: "텍스트를 의미가 반영된 고차원 벡터로 변환한 표현" },
  },
  {
    themeName: "RAG",
    type: "term-to-def",
    tagNames: ["RAG"],
    payload: { term: "벡터 데이터베이스", definition: "임베딩 벡터를 저장하고 유사도 기반 검색을 지원하는 데이터베이스" },
  },
  {
    themeName: "RAG",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["RAG"],
    payload: { term: "청킹", definition: "긴 문서를 검색과 처리에 적합한 크기의 작은 조각으로 나누는 작업" },
  },
  {
    themeName: "RAG",
    type: "essay",
    difficulty: "advanced",
    tagNames: ["RAG"],
    payload: {
      prompt: "RAG가 LLM의 환각 문제를 줄이는 데 도움이 되는 이유를 한 문장으로 설명하시오.",
      answer: "모델이 기억에만 의존하지 않고 검색된 실제 문서 내용을 근거로 답변을 생성하기 때문이다.",
    },
  },
  {
    themeName: "RAG",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["RAG"],
    payload: { term: "리랭킹", definition: "1차로 검색된 후보 문서들을 관련성 기준으로 다시 정렬해 상위 결과의 품질을 높이는 단계" },
  },

  // ───────────── AI Agent ─────────────
  {
    themeName: "AI Agent",
    type: "term-to-def",
    tagNames: ["Agent"],
    payload: { term: "AI 에이전트", definition: "목표 달성을 위해 스스로 계획을 세우고 도구를 호출해 행동하는 AI 시스템" },
  },
  {
    themeName: "AI Agent",
    type: "def-to-term",
    tagNames: ["Agent"],
    payload: { term: "툴 콜링", definition: "언어 모델이 외부 함수나 API를 호출해 작업을 수행하는 기능" },
  },
  {
    themeName: "AI Agent",
    type: "essay",
    tagNames: ["Agent"],
    payload: {
      prompt: "AI 에이전트와 단순 챗봇의 차이를 한 문장으로 설명하시오.",
      answer: "에이전트는 스스로 계획을 세우고 도구를 활용해 행동까지 수행하지만, 챗봇은 대화 응답 생성에 그친다.",
    },
  },
  {
    themeName: "AI Agent",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["Agent"],
    payload: { term: "멀티 에이전트", definition: "여러 개의 AI 에이전트가 역할을 나눠 협업하며 하나의 목표를 수행하는 구조" },
  },
  {
    themeName: "AI Agent",
    type: "term-to-def",
    difficulty: "advanced",
    tagNames: ["Agent"],
    payload: { term: "플래닝", definition: "에이전트가 목표 달성을 위해 수행할 작업들을 순서대로 계획하는 과정" },
  },

  // ───────────── AI 기초 ─────────────
  {
    themeName: "AI 기초",
    type: "essay",
    tagNames: ["ML"],
    payload: {
      prompt: "지도학습과 비지도학습의 차이를 한 문장으로 설명하시오.",
      answer: "지도학습은 정답 레이블이 있는 데이터로 학습하고, 비지도학습은 레이블 없이 데이터의 패턴을 찾는다.",
    },
  },
  {
    themeName: "AI 기초",
    type: "def-to-term",
    tagNames: ["AI기초"],
    payload: { term: "인공지능", definition: "인간의 학습, 추론, 인식 능력을 컴퓨터로 구현하려는 기술 분야" },
  },
  {
    themeName: "AI 기초",
    type: "term-to-def",
    tagNames: ["AI기초"],
    payload: { term: "강화학습", definition: "행동에 대한 보상을 통해 최적의 정책을 스스로 학습하는 방식" },
  },
  {
    themeName: "AI 기초",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["AI기초"],
    payload: { term: "머신러닝", definition: "규칙을 직접 프로그래밍하지 않고 데이터로부터 패턴을 학습하는 인공지능의 한 분야" },
  },
  {
    themeName: "AI 기초",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["AI기초"],
    payload: { term: "딥러닝", definition: "여러 층의 인공신경망을 활용해 데이터로부터 복잡한 패턴을 학습하는 머신러닝의 한 분야" },
  },
];
