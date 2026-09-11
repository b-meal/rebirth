import assert from "node:assert/strict";
import { test } from "node:test";

import { adviseFromResult } from "./guidance.ts";

const base = {
  animalType: "dog" as const,
  breedGuess: null,
  appearance: "흰색 소형견, 말티즈 계열 추정",
  color: ["흰색"],
  size: "small" as const,
  condition: "털이 엉킴",
  story: "화단 근처에 혼자 있었고 사람을 피하지 않음",
  collarOrHarness: false,
  visibleInjury: false,
  earTip: null,
  confidence: 0.8,
  warnings: [] as string[],
};

test("신뢰도가 충분하면 초안을 그대로 채움", () => {
  const advice = adviseFromResult(base);
  assert.equal(advice.state, "draft");
  assert.equal(advice.message, null);
});

test("동물을 못 찾으면 재촬영으로 보냄", () => {
  const advice = adviseFromResult({ ...base, animalType: "unknown" });
  assert.equal(advice.state, "not-animal");
  assert.match(advice.message ?? "", /동물이 담긴 사진/);
});

test("신뢰도가 낮으면 진행과 재촬영을 모두 열어 둠", () => {
  const advice = adviseFromResult({ ...base, confidence: 0.2 });
  assert.equal(advice.state, "low-quality");
  assert.match(advice.message ?? "", /그대로 진행하거나/);
});

test("동물을 못 찾은 판정이 신뢰도보다 앞섬", () => {
  const advice = adviseFromResult({ ...base, animalType: "unknown", confidence: 0.9 });
  assert.equal(advice.state, "not-animal");
});

test("경계값 0.4 는 초안으로 통과", () => {
  // RETAKE_CONFIDENCE 가 0.4 이고 needsRetake 는 미만일 때만 참
  assert.equal(adviseFromResult({ ...base, confidence: 0.4 }).state, "draft");
  assert.equal(adviseFromResult({ ...base, confidence: 0.39 }).state, "low-quality");
});

test("어떤 판정에도 confidence 숫자를 문구에 넣지 않음", () => {
  for (const c of [0.1, 0.5, 0.95]) {
    const advice = adviseFromResult({ ...base, confidence: c });
    assert.doesNotMatch(advice.message ?? "", /\d/);
  }
});

test("RETAKE_CONFIDENCE 가 @rebirth/types 의 값과 같음", async () => {
  // guidance.ts 는 런타임 import 를 피해 값을 복제함
  // 원본을 파일로 읽어 비교해 한쪽만 바뀌는 것을 막음
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(
    new URL("../../../types/src/analyze.ts", import.meta.url),
    "utf8",
  );
  const matched = text.match(/RETAKE_CONFIDENCE\s*=\s*([\d.]+)/);
  assert.ok(matched, "원본에서 RETAKE_CONFIDENCE 를 찾지 못함");
  assert.equal(Number(matched[1]), 0.4);
});
