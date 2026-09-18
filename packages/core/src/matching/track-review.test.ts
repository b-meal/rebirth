import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SYSTEM,
  TrackReviewError,
  bearingWord,
  describeTrack,
  reviewTrack,
  trackReview,
  type TrackReviewInput,
} from "./track-review.ts";

const 입력: TrackReviewInput = {
  nodes: [
    {
      reportId: "11111111-1111-1111-1111-111111111111",
      areaName: "서울 마포구 망원동",
      occurredAt: new Date("2026-09-16T09:00:00.000Z"),
    },
    {
      reportId: "22222222-2222-2222-2222-222222222222",
      areaName: null,
      occurredAt: new Date("2026-09-16T15:30:00.000Z"),
    },
  ],
  confidence: 62,
  prediction: {
    radiusKm: 1.24,
    straightness: 0.8231,
    hoursSinceLast: 5.4,
    bearingDeg: 44,
  },
};

test("SYSTEM 이 개체를 확정하지 않고 원칙 낱말을 모두 담는다", () => {
  assert.ok(!SYSTEM.includes("확정"));
  for (const 낱말 of [
    "확인할 후보",
    "품종을 단정하지 않습니다",
    "점수를 다시 매기지 않습니다",
    "눈에 보이는 특징",
    "좌표 숫자를 쓰지 않습니다",
    "지역명과 방향",
  ]) {
    assert.ok(SYSTEM.includes(낱말), 낱말);
  }
});

test("trackReview 가 searchOrder 4개를 거부한다", () => {
  const parsed = trackReview.safeParse({
    movement: "북동쪽으로 이어짐",
    photoConsistency: "consistent",
    searchOrder: ["망원한강공원", "망원시장", "합정역", "당인리길"],
    caution: null,
  });
  assert.equal(parsed.success, false);
});

test("trackReview 가 photoConsistency same 을 거부한다", () => {
  const parsed = trackReview.safeParse({
    movement: "북동쪽으로 이어짐",
    photoConsistency: "same",
    searchOrder: ["망원한강공원"],
    caution: null,
  });
  assert.equal(parsed.success, false);
});

test("trackReview 가 세 개 이하와 caution null 을 받는다", () => {
  const parsed = trackReview.safeParse({
    movement: "북동쪽으로 이어짐",
    photoConsistency: "unclear",
    searchOrder: ["망원한강공원", "망원시장"],
    caution: null,
  });
  assert.equal(parsed.success, true);
});

test("describeTrack 이 좌표 숫자를 문장에 담지 않는다", () => {
  const text = describeTrack(입력);
  // 위경도는 소수점 아래 세 자리 이상으로 적히므로 그 모양이 없으면 좌표 아님
  assert.ok(!/\d+\.\d{3,}/.test(text), text);
  assert.ok(!text.includes("lat"));
  assert.ok(!text.includes("lng"));
  assert.ok(text.includes("서울 마포구 망원동"));
  assert.ok(text.includes("지역 미확인"));
  assert.ok(text.includes("북동쪽"));
});

test("describeTrack 이 노드 시각을 한국 시간으로 적는다", () => {
  const text = describeTrack(입력);
  // UTC 로 적으면 09:00 과 15:30 이 되어 모델이 저녁 목격을 한낮으로 읽음
  assert.ok(text.includes("2026-09-16 18:00 KST"), text);
  assert.ok(text.includes("2026-09-17 00:30 KST"), text);
});

test("describeTrack 이 주변 상황을 규칙이 센 숫자 그대로 적는다", () => {
  const text = describeTrack({
    ...입력,
    situation: {
      phase: "stale",
      hoursSinceLost: 30.4,
      radiusKm: 1.24,
      around: { sightings: 9, candidates: 2 },
      coverage: "quiet",
    },
  });
  assert.ok(text.includes("[주변 상황]"));
  assert.ok(text.includes("실종 이후: 30시간 (사흘 안)"));
  assert.ok(text.includes("반경 1.2km 안 발견 제보 9건, 그중 닮은 후보 2건"));
  assert.ok(text.includes("보는 눈이 적은 곳"));
  // 상황이 없으면 절 자체가 빠져 모델이 빈 절을 읽지 않음
  assert.ok(!describeTrack(입력).includes("[주변 상황]"));
});

test("SYSTEM 이 숫자를 다시 세지 않게 막는다", () => {
  assert.ok(SYSTEM.includes("숫자는 주어진 값만 인용"));
});

test("bearingWord 가 여덟 방향으로 나눈다", () => {
  assert.equal(bearingWord(0), "북");
  assert.equal(bearingWord(44), "북동");
  assert.equal(bearingWord(181), "남");
  assert.equal(bearingWord(359), "북");
  assert.equal(bearingWord(-90), "서");
});

test("reviewTrack 이 키가 없으면 no-config 로 던진다", async () => {
  const 원래키 = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(reviewTrack(입력), (error: unknown) => {
      assert.ok(error instanceof TrackReviewError);
      assert.equal(error.kind, "no-config");
      return true;
    });
  } finally {
    if (원래키 === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = 원래키;
  }
});
