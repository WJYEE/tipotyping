// 기본 문제은행 확장분. Theme 단위 파일로 나눠 관리한다.
import { aiExtraQuestions } from "@/db/seed/defaultQuestions/extra/ai";
import { businessExtraQuestions } from "@/db/seed/defaultQuestions/extra/business";
import { careerLanguageExtraQuestions } from "@/db/seed/defaultQuestions/extra/careerLanguage";
import { csitExtraQuestions } from "@/db/seed/defaultQuestions/extra/csit";
import { dataStatsExtraQuestions } from "@/db/seed/defaultQuestions/extra/dataStats";
import { dsAlgoExtraQuestions } from "@/db/seed/defaultQuestions/extra/dsAlgo";
import { finance1ExtraQuestions } from "@/db/seed/defaultQuestions/extra/finance1";
import { finance2ExtraQuestions } from "@/db/seed/defaultQuestions/extra/finance2";
import { productExtraQuestions } from "@/db/seed/defaultQuestions/extra/product";
import { pythonExtraQuestions } from "@/db/seed/defaultQuestions/extra/python";
import { sqlExtraQuestions } from "@/db/seed/defaultQuestions/extra/sql";
import type { SeedQuestion } from "@/db/seed/seedTypes";

export const extraQuestions: SeedQuestion[] = [
  ...sqlExtraQuestions,
  ...pythonExtraQuestions,
  ...dsAlgoExtraQuestions,
  ...dataStatsExtraQuestions,
  ...productExtraQuestions,
  ...finance1ExtraQuestions,
  ...finance2ExtraQuestions,
  ...businessExtraQuestions,
  ...csitExtraQuestions,
  ...aiExtraQuestions,
  ...careerLanguageExtraQuestions,
];
