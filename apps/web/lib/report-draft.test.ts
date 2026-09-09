import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMPTY_DRAFT,
  allowedStep,
  firstIncompleteStep,
  parseStep,
  parseStored,
  toStored,
  type ReportDraft,
} from "./report-draft.ts";

const AREA = { areaName: "역삼동", fullName: "서울 강남구 역삼동", placeName: null };
const POINT = { lat: 37.5, lng: 127.03 };

const FILLED: ReportDraft = {
  careSituation: "roaming",
  area: AREA,
  point: POINT,
  appearance: "흰색 소형견",
};

test("사진이나 보호 상황이 없으면 1 단계", () => {
  assert.equal(firstIncompleteStep(EMPTY_DRAFT, 0), 1);
  assert.equal(firstIncompleteStep(EMPTY_DRAFT, 1), 1);
  assert.equal(firstIncompleteStep({ ...FILLED, careSituation: null }, 1), 1);
  // 보호 상황만 골라도 사진이 없으면 넘어가지 않음
  assert.equal(firstIncompleteStep(FILLED, 0), 1);
});

test("장소를 고르기 전에는 2 단계", () => {
  assert.equal(firstIncompleteStep({ ...FILLED, area: null }, 1), 2);
});

test("외형이 비어 있거나 공백뿐이면 3 단계", () => {
  assert.equal(firstIncompleteStep({ ...FILLED, appearance: "" }, 1), 3);
  assert.equal(firstIncompleteStep({ ...FILLED, appearance: "   " }, 1), 3);
});

test("모두 채우면 4 단계", () => {
  assert.equal(firstIncompleteStep(FILLED, 1), 4);
});

test("범위 밖 step 은 1 단계로 읽는다", () => {
  for (const raw of [null, "", "0", "5", "-1", "2.5", "abc"]) {
    assert.equal(parseStep(raw), 1, `${raw} 는 1 이어야 함`);
  }
  assert.equal(parseStep("3"), 3);
});

test("선행 조건을 넘는 단계로는 들어가지 못한다", () => {
  assert.equal(allowedStep(4, 2), 2);
  assert.equal(allowedStep(1, 4), 1);
  assert.equal(allowedStep(3, 3), 3);
});

test("사진과 정확 좌표는 저장하지 않는다", () => {
  const stored = toStored(FILLED);
  assert.deepEqual(Object.keys(stored).sort(), ["appearance", "area", "careSituation"]);
  assert.equal("point" in stored, false);
});

test("저장분을 되읽어도 좌표는 살아나지 않는다", () => {
  const restored = parseStored(JSON.stringify(toStored(FILLED)));
  assert.equal(restored.appearance, "흰색 소형견");
  assert.deepEqual(restored.area, AREA);
  assert.equal(restored.point, undefined);
});

test("손상된 저장분은 빈 초안이 된다", () => {
  assert.deepEqual(parseStored("{"), {});
  assert.deepEqual(parseStored(null), {});
});
