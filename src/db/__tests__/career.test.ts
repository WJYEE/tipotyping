import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
  careerStatsRepo,
  companyRepo,
  competencyRepo,
  jobPostingRepo,
  requirementRepo,
  roleRepo,
} from "@/db/repositories";
import { summarizeJobPostings } from "@/db/repositories/careerStatsRepo";

async function clearAllTables() {
  // db.tables를 그대로 순회한다 — backup.ts/backup.test.ts와 같은 "테이블 하드코딩 금지" 원칙.
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

async function createJobPosting(overrides: { positionTitle?: string; companyName?: string } = {}) {
  const company = await companyRepo.getOrCreate(overrides.companyName ?? "Toss");
  return jobPostingRepo.create({
    companyId: company.id,
    postingTitle: "2026 상반기 공채",
    positionTitle: overrides.positionTitle ?? "Business Data Analyst",
    responsibilities: "데이터 분석",
    qualifications: "SQL 3년 이상",
    preferredQualifications: "Python",
  });
}

describe("companyRepo.getOrCreate", () => {
  it("같은 이름이면 재사용하고, 다르면 새로 만든다", async () => {
    const a = await companyRepo.getOrCreate("Toss");
    const b = await companyRepo.getOrCreate("Toss");
    const c = await companyRepo.getOrCreate("Kurly");
    expect(b.id).toBe(a.id);
    expect(c.id).not.toBe(a.id);
    expect(await companyRepo.list()).toHaveLength(2);
  });
});

describe("jobPostingRepo.remove", () => {
  it("JobPosting 삭제 시 그 Requirement와 연결된 RequirementCompetency/RequirementRole까지 함께 지운다", async () => {
    const jobPosting = await createJobPosting();
    const requirement = await requirementRepo.create({
      jobPostingId: jobPosting.id,
      text: "SQL 능숙",
      sourceSection: "qualification",
    });
    const competency = await competencyRepo.getOrCreate("SQL", "data");
    const role = await roleRepo.getOrCreate("Business DA");
    await requirementRepo.linkCompetency(requirement.id, competency.id);
    await requirementRepo.linkRole(requirement.id, role.id);

    await jobPostingRepo.remove(jobPosting.id);

    expect(await jobPostingRepo.get(jobPosting.id)).toBeUndefined();
    expect(await requirementRepo.get(requirement.id)).toBeUndefined();
    expect(await db.requirementCompetencies.where("requirementId").equals(requirement.id).count()).toBe(0);
    expect(await db.requirementRoles.where("requirementId").equals(requirement.id).count()).toBe(0);
    // Company/Competency/Role 자체는 다른 JD에서도 재사용하는 공용 데이터이므로 남아있어야 한다.
    expect(await competencyRepo.get(competency.id)).toBeDefined();
    expect(await roleRepo.get(role.id)).toBeDefined();
  });
});

describe("requirementRepo link/unlink", () => {
  it("같은 조합을 두 번 link해도 중복 저장하지 않는다", async () => {
    const jobPosting = await createJobPosting();
    const requirement = await requirementRepo.create({ jobPostingId: jobPosting.id, text: "SQL" });
    const competency = await competencyRepo.getOrCreate("SQL", "data");

    await requirementRepo.linkCompetency(requirement.id, competency.id);
    await requirementRepo.linkCompetency(requirement.id, competency.id);

    expect(await requirementRepo.listCompetencies(requirement.id)).toHaveLength(1);
  });

  it("unlink하면 연결이 사라지지만 Requirement/Competency 자체는 남는다", async () => {
    const jobPosting = await createJobPosting();
    const requirement = await requirementRepo.create({ jobPostingId: jobPosting.id, text: "SQL" });
    const competency = await competencyRepo.getOrCreate("SQL", "data");
    await requirementRepo.linkCompetency(requirement.id, competency.id);

    await requirementRepo.unlinkCompetency(requirement.id, competency.id);

    expect(await requirementRepo.listCompetencies(requirement.id)).toHaveLength(0);
    expect(await requirementRepo.get(requirement.id)).toBeDefined();
    expect(await competencyRepo.get(competency.id)).toBeDefined();
  });

  it("Requirement 삭제 시 연결된 Competency/Role 링크도 함께 지운다", async () => {
    const jobPosting = await createJobPosting();
    const requirement = await requirementRepo.create({ jobPostingId: jobPosting.id, text: "SQL" });
    const competency = await competencyRepo.getOrCreate("SQL", "data");
    await requirementRepo.linkCompetency(requirement.id, competency.id);

    await requirementRepo.remove(requirement.id);

    expect(await db.requirementCompetencies.where("requirementId").equals(requirement.id).count()).toBe(0);
  });
});

describe("summarizeJobPostings / deriveJobPostingStatus 연동", () => {
  it("Requirement가 없으면 '요구사항 입력 전' 상태다", async () => {
    const jobPosting = await createJobPosting();
    const [summary] = await summarizeJobPostings([jobPosting]);
    expect(summary.status).toBe("not-started");
    expect(summary.requirementCount).toBe(0);
  });

  it("Requirement는 있지만 일부만 태깅됐으면 '정리 중'이다", async () => {
    const jobPosting = await createJobPosting();
    const r1 = await requirementRepo.create({ jobPostingId: jobPosting.id, text: "SQL" });
    await requirementRepo.create({ jobPostingId: jobPosting.id, text: "Python" });
    const competency = await competencyRepo.getOrCreate("SQL", "data");
    const role = await roleRepo.getOrCreate("Business DA");
    await requirementRepo.linkCompetency(r1.id, competency.id);
    await requirementRepo.linkRole(r1.id, role.id);

    const [summary] = await summarizeJobPostings([jobPosting]);
    expect(summary.status).toBe("in-progress");
    expect(summary.requirementCount).toBe(2);
  });

  it("모든 Requirement가 Competency와 Role 둘 다 태깅되면 '정리 완료'다", async () => {
    const jobPosting = await createJobPosting();
    const r1 = await requirementRepo.create({ jobPostingId: jobPosting.id, text: "SQL" });
    const competency = await competencyRepo.getOrCreate("SQL", "data");
    const role = await roleRepo.getOrCreate("Business DA");
    await requirementRepo.linkCompetency(r1.id, competency.id);
    await requirementRepo.linkRole(r1.id, role.id);

    const [summary] = await summarizeJobPostings([jobPosting]);
    expect(summary.status).toBe("complete");
  });

  it("회사명을 함께 붙여 돌려준다", async () => {
    const jobPosting = await createJobPosting({ companyName: "Kurly" });
    const [summary] = await summarizeJobPostings([jobPosting]);
    expect(summary.companyName).toBe("Kurly");
  });
});

describe("careerStatsRepo", () => {
  it("getOverviewStats: 저장 JD 수와 연결된 Competency 종류 수를 실제 데이터로 센다", async () => {
    const jd1 = await createJobPosting({ companyName: "Toss" });
    const jd2 = await createJobPosting({ companyName: "Kurly" });
    const r1 = await requirementRepo.create({ jobPostingId: jd1.id, text: "SQL" });
    const r2 = await requirementRepo.create({ jobPostingId: jd2.id, text: "SQL 역량" });
    const sql = await competencyRepo.getOrCreate("SQL", "data");
    await requirementRepo.linkCompetency(r1.id, sql.id);
    await requirementRepo.linkCompetency(r2.id, sql.id);
    // 연결되지 않은 Competency는 "연결 Competency" 수에 포함하지 않는다.
    await competencyRepo.getOrCreate("Python", "data");

    const stats = await careerStatsRepo.getOverviewStats();
    expect(stats.savedJdCount).toBe(2);
    expect(stats.extractedCompetencyCount).toBe(1);
    expect(stats.connectedEvidenceCount).toBe(0);
    expect(stats.preparationGapCount).toBe(0);
    expect(stats.lastUpdatedAt).not.toBeNull();
  });

  it("데이터가 전혀 없으면 Overview는 전부 0/null이다 (임의 수치 없음)", async () => {
    const stats = await careerStatsRepo.getOverviewStats();
    expect(stats).toEqual({
      savedJdCount: 0,
      extractedCompetencyCount: 0,
      connectedEvidenceCount: 0,
      preparationGapCount: 0,
      lastUpdatedAt: null,
    });
  });

  it("getCompetencyBubbleStats: 서로 다른 JD 수를 demandCount로, 전체 JD 수를 totalJd로 돌려준다", async () => {
    const jd1 = await createJobPosting({ companyName: "Toss" });
    const jd2 = await createJobPosting({ companyName: "Kurly" });
    const r1 = await requirementRepo.create({ jobPostingId: jd1.id, text: "SQL" });
    const r2 = await requirementRepo.create({ jobPostingId: jd2.id, text: "SQL" });
    const sql = await competencyRepo.getOrCreate("SQL", "data");
    await requirementRepo.linkCompetency(r1.id, sql.id);
    await requirementRepo.linkCompetency(r2.id, sql.id);

    const bubbles = await careerStatsRepo.getCompetencyBubbleStats();
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].demandCount).toBe(2);
    expect(bubbles[0].totalJd).toBe(2);
  });

  it("getRoleMixStats: Role별 태깅된 Requirement 비율을 돌려준다", async () => {
    const jd1 = await createJobPosting();
    const r1 = await requirementRepo.create({ jobPostingId: jd1.id, text: "a" });
    const r2 = await requirementRepo.create({ jobPostingId: jd1.id, text: "b" });
    const r3 = await requirementRepo.create({ jobPostingId: jd1.id, text: "c" });
    const da = await roleRepo.getOrCreate("Business DA");
    const pm = await roleRepo.getOrCreate("PM");
    await requirementRepo.linkRole(r1.id, da.id);
    await requirementRepo.linkRole(r2.id, da.id);
    await requirementRepo.linkRole(r3.id, pm.id);

    const mix = await careerStatsRepo.getRoleMixStats();
    expect(mix).toEqual([
      { role: da, count: 2, percent: 67 },
      { role: pm, count: 1, percent: 33 },
    ]);
  });

  it("아무것도 연결되지 않은 상태에서는 빈 배열을 돌려준다 (임의 수치 없음)", async () => {
    expect(await careerStatsRepo.getCompetencyBubbleStats()).toEqual([]);
    expect(await careerStatsRepo.getRoleMixStats()).toEqual([]);
  });

  it("getRecentJobPostings: 최신순으로 limit개만 돌려준다", async () => {
    // createdAt(ms) tie로 정렬이 흔들리지 않도록 생성 사이에 약간의 간격을 둔다.
    await createJobPosting({ positionTitle: "A" });
    await new Promise((r) => setTimeout(r, 2));
    await createJobPosting({ positionTitle: "B" });
    await new Promise((r) => setTimeout(r, 2));
    await createJobPosting({ positionTitle: "C" });

    const recent = await careerStatsRepo.getRecentJobPostings(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].jobPosting.positionTitle).toBe("C");
  });
});
