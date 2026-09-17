import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { EMBEDDING_DIMENSIONS } from "../matching/embed-text.ts";

test("차원 값이 DB 스키마와 같음", () => {
  // 두 패키지가 각자 상수를 들고 있어 한쪽만 바뀌면 저장이 막힘
  const text = readFileSync(new URL("../../../db/src/schema/embeddings.ts", import.meta.url), "utf8");
  const matched = text.match(/EMBEDDING_DIMENSIONS\s*=\s*(\d+)/);
  assert.ok(matched, "스키마에서 차원을 찾지 못함");
  assert.equal(Number(matched[1]), EMBEDDING_DIMENSIONS);
});
