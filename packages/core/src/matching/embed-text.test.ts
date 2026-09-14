import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEmbedText, isEmbeddable } from "./embed-text.ts";

const base = {
  animalType: "dog",
  breedGuess: null,
  colors: [],
  size: "unknown",
  conditionTags: [],
  appearance: null,
};

test("구조화 값과 자유 문장이 한 문단으로 합쳐진다", () => {
  const text = buildEmbedText({
    ...base,
    colors: ["흰색"],
    size: "small",
    breedGuess: "말티즈",
    conditionTags: ["털 엉킴"],
    appearance: "화단 근처에 혼자 있었음",
  });
  assert.equal(
    text,
    "개, 소형, 흰색, 말티즈 계열 추정, 털 엉킴, 화단 근처에 혼자 있었음",
  );
});

test("품종은 계열 추정으로만 들어가 확정 표현이 벡터에 섞이지 않는다", () => {
  const text = buildEmbedText({ ...base, breedGuess: "푸들" });
  assert.ok(text.includes("푸들 계열 추정"));
  assert.ok(!text.includes("푸들,"));
});

test("빈 값은 자리를 만들지 않는다", () => {
  assert.equal(buildEmbedText(base), "개");
  assert.equal(buildEmbedText({ ...base, size: "unknown", colors: [] }), "개");
});

test("아주 긴 설명은 잘린다", () => {
  const text = buildEmbedText({ ...base, appearance: "가".repeat(2000) });
  assert.equal(text.length, 1000);
});

test("넣을 말이 종류뿐이면 임베딩 대상이 아니다", () => {
  assert.equal(isEmbeddable(base), false);
  assert.equal(isEmbeddable({ ...base, colors: ["흰색"] }), true);
  assert.equal(isEmbeddable({ ...base, appearance: "털이 엉킴" }), true);
  assert.equal(isEmbeddable({ ...base, appearance: "   " }), false);
});
