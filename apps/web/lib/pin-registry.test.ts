import assert from "node:assert/strict";
import test from "node:test";

import { reconcilePins, type PinReconciler } from "./pin-registry.ts";

type Feature = { at: number };
type Entry = { key: string; at: number; alive: boolean };

function fakeHandlers(log: string[]): PinReconciler<Entry, Feature & { key: string }> {
  return {
    create: (feature) => {
      log.push(`create ${feature.key}`);
      return { key: feature.key, at: feature.at, alive: true };
    },
    update: (entry, feature) => {
      if (entry.at === feature.at) return false;
      log.push(`move ${entry.key}`);
      entry.at = feature.at;
      return true;
    },
    remove: (entry) => {
      log.push(`remove ${entry.key}`);
      entry.alive = false;
    },
  };
}

const view = (...keys: string[]) => keys.map((key) => ({ key, feature: { key, at: 0 } }));

test("같은 화면을 두 번 맞추면 두 번째는 만들고 지우는 일이 없다", () => {
  const registry = new Map<string, Entry>();
  const log: string[] = [];
  const first = reconcilePins(registry, view("a", "b", "c"), fakeHandlers(log));
  assert.equal(first.created, 3);

  const second = reconcilePins(registry, view("a", "b", "c"), fakeHandlers(log));
  assert.deepEqual(
    { created: second.created, updated: second.updated, removed: second.removed },
    { created: 0, updated: 0, removed: 0 },
  );
  // 요소가 같은 참조로 남아 포털 대상이 바뀌지 않음
  assert.equal(second.entries[0], first.entries[0]);
});

test("지도를 끌면 가장자리에서 벗어난 것만 지우고 새로 든 것만 만든다", () => {
  const registry = new Map<string, Entry>();
  const log: string[] = [];
  reconcilePins(registry, view("a", "b"), fakeHandlers(log));
  log.length = 0;

  const result = reconcilePins(registry, view("b", "c"), fakeHandlers(log));
  assert.deepEqual(log.sort(), ["create c", "remove a"]);
  assert.equal(result.entries.map((entry) => entry.key).join(","), "b,c");
  assert.equal(registry.get("a"), undefined);
});

test("타일 경계에 걸쳐 두 번 올라온 키는 한 번만 셈", () => {
  const registry = new Map<string, Entry>();
  const result = reconcilePins(registry, view("a", "a", "b"), fakeHandlers([]));
  assert.equal(result.created, 2);
  assert.equal(result.entries.length, 2);
});

test("자리만 바뀐 핀은 만들지 않고 옮긴다", () => {
  const registry = new Map<string, Entry>();
  const log: string[] = [];
  reconcilePins(registry, view("a"), fakeHandlers(log));
  const moved = reconcilePins(
    registry,
    [{ key: "a", feature: { key: "a", at: 5 } }],
    fakeHandlers(log),
  );
  assert.equal(moved.created, 0);
  assert.equal(moved.updated, 1);
  assert.equal(registry.get("a")?.at, 5);
});
