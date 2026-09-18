import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COVERAGE_MIN_REPORTS,
  actionLine,
  buildSearchAdvice,
  coverageLine,
  densityLine,
  densityRadiusKm,
  searchPhase,
  type SearchAdviceInput,
} from "./search-advice.ts";

const NOW = new Date("2026-09-17T12:00:00+09:00");

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function input(over: Partial<SearchAdviceInput> = {}): SearchAdviceInput {
  return {
    lostOccurredAt: hoursAgo(30),
    now: NOW,
    animalType: "dog",
    size: "small",
    gridMeters: 300,
    radiusKm: 1.2,
    around: { sightings: 5, candidates: 2 },
    areaSightings: 10,
    latestCandidateAt: hoursAgo(2),
    ...over,
  };
}

test("6, 24, 72 시간 경계에서 단계가 한 칸씩 내려간다", () => {
  assert.equal(searchPhase(5.99), "fresh");
  assert.equal(searchPhase(6), "recent");
  assert.equal(searchPhase(23.99), "recent");
  assert.equal(searchPhase(24), "stale");
  assert.equal(searchPhase(71), "stale");
  assert.equal(searchPhase(73), "cold");
});

test("기준 시각은 실종 시각이고 최근 후보 시각은 단계를 바꾸지 못한다", () => {
  // 사흘 전 잃었는데 두 시간 전 닮은 제보가 있어도 cold 그대로
  const advice = buildSearchAdvice(
    input({ lostOccurredAt: hoursAgo(80), latestCandidateAt: hoursAgo(2) }),
  );
  assert.equal(advice.phase, "cold");
  assert.equal(advice.latestCandidateAt?.getTime(), hoursAgo(2).getTime());
});

test("미래 실종 시각은 경과 0 으로 눌러 첫 단계가 된다", () => {
  const advice = buildSearchAdvice(input({ lostOccurredAt: hoursAgo(-3) }));
  assert.equal(advice.hoursSinceLost, 0);
  assert.equal(advice.phase, "fresh");
});

test("행동 문구는 고양이와 그 외로 갈리고 숫자가 없다", () => {
  assert.notEqual(actionLine("cold", "cat"), actionLine("cold", "dog"));
  assert.equal(actionLine("cold", "unknown"), actionLine("cold", "dog"));
  assert.match(actionLine("cold", "cat"), /가까운 곳/);
  assert.match(actionLine("cold", "dog"), /넓혀/);
  for (const phase of ["fresh", "recent", "stale", "cold"] as const) {
    for (const animal of ["dog", "cat", "other", "unknown"] as const) {
      assert.doesNotMatch(actionLine(phase, animal), /\d/);
    }
  }
});

test("밀도 줄은 제보 없음, 후보 없음, 둘 다 있음을 갈라 말한다", () => {
  assert.equal(
    densityLine(1.24, { sightings: 0, candidates: 0 }),
    "반경 1.2km 안에 발견 제보가 없어요",
  );
  assert.equal(
    densityLine(2, { sightings: 5, candidates: 0 }),
    "반경 2.0km 안 발견 제보 5건, 닮은 후보는 아직 없어요",
  );
  assert.equal(
    densityLine(2, { sightings: 9, candidates: 2 }),
    "반경 2.0km 안 발견 제보 9건, 그중 닮은 후보 2건",
  );
});

test("밀도 반경은 격자 두 배를 하한으로 둔다", () => {
  assert.equal(densityRadiusKm(0.4, 300), 0.6);
  assert.equal(densityRadiusKm(0.4, 1000), 2);
  assert.equal(densityRadiusKm(3, 1000), 3);
});

test("커버리지 줄은 최근 제보가 하한보다 적을 때만 붙는다", () => {
  assert.equal(coverageLine(COVERAGE_MIN_REPORTS), null);
  assert.match(coverageLine(COVERAGE_MIN_REPORTS - 1) ?? "", /보는 눈이 적어요/);
  assert.equal(buildSearchAdvice(input({ areaSightings: 0 })).coverage, "quiet");
  assert.equal(buildSearchAdvice(input({ areaSightings: 10 })).coverage, "active");
});

test("중심 좌표가 없어 세지 못하면 밀도와 커버리지 줄을 비운다", () => {
  const advice = buildSearchAdvice(input({ around: null, areaSightings: null }));
  assert.equal(advice.lines.density, null);
  assert.equal(advice.lines.coverage, null);
  assert.equal(advice.coverage, null);
  assert.ok(advice.lines.action.length > 0);
});
