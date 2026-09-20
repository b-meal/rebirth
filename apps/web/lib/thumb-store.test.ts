import assert from "node:assert/strict";
import test from "node:test";

import { createThumbStore, type ThumbFetcher } from "./thumb-store.ts";

// 예약을 손으로 돌려 같은 틱의 요청이 한 묶음으로 나가는지 봄
function manualSchedule() {
  const jobs: Array<() => void> = [];
  return {
    schedule: (flush: () => void) => {
      jobs.push(flush);
    },
    run: () => {
      for (const job of jobs.splice(0)) job();
    },
  };
}

function recordingFetcher(answer: (ids: string[]) => Record<string, string | null>) {
  const calls: string[][] = [];
  const fetcher: ThumbFetcher = async (ids) => {
    calls.push(ids);
    return answer(ids);
  };
  return { calls, fetcher };
}

test("같은 틱의 요청은 한 번에 묶어 보냄", async () => {
  const clock = manualSchedule();
  const { calls, fetcher } = recordingFetcher((ids) =>
    Object.fromEntries(ids.map((id) => [id, `url-${id}`])),
  );
  const store = createThumbStore({ fetcher, schedule: clock.schedule });

  const a = store.request("a");
  const b = store.request("b");
  const again = store.request("a");
  assert.equal(calls.length, 0);
  clock.run();

  assert.deepEqual(await Promise.all([a, b, again]), ["url-a", "url-b", "url-a"]);
  assert.deepEqual(calls, [["a", "b"]]);
  assert.equal(store.get("a"), "url-a");
});

test("아는 주소는 다시 묻지 않고 바로 돌려줌", async () => {
  const clock = manualSchedule();
  const { calls, fetcher } = recordingFetcher(() => ({ a: "url-a" }));
  const store = createThumbStore({ fetcher, schedule: clock.schedule });

  const first = store.request("a");
  clock.run();
  await first;
  assert.equal(await store.request("a"), "url-a");
  assert.equal(calls.length, 1);
});

test("묶음 크기를 넘으면 나눠 보냄", async () => {
  const clock = manualSchedule();
  const { calls, fetcher } = recordingFetcher((ids) =>
    Object.fromEntries(ids.map((id) => [id, null])),
  );
  const store = createThumbStore({ fetcher, schedule: clock.schedule, batchSize: 2 });

  const all = ["a", "b", "c"].map((id) => store.request(id));
  clock.run();
  await Promise.all(all);
  assert.deepEqual(calls, [["a", "b"], ["c"]]);
});

test("사진이 없다는 답도 기억해 되묻지 않음", async () => {
  const clock = manualSchedule();
  const { calls, fetcher } = recordingFetcher(() => ({}));
  const store = createThumbStore({ fetcher, schedule: clock.schedule });

  const first = store.request("a");
  clock.run();
  assert.equal(await first, null);
  assert.equal(await store.request("a"), null);
  assert.equal(calls.length, 1);
});

test("실패하면 잠시 null 로 두고 시간이 지나면 다시 물음", async () => {
  const clock = manualSchedule();
  let time = 0;
  let failing = true;
  const calls: string[][] = [];
  const fetcher: ThumbFetcher = async (ids) => {
    calls.push(ids);
    if (failing) throw new Error("down");
    return { a: "url-a" };
  };
  const store = createThumbStore({
    fetcher,
    schedule: clock.schedule,
    retryMs: 1000,
    now: () => time,
  });

  const first = store.request("a");
  clock.run();
  assert.equal(await first, null);
  assert.equal(await store.request("a"), null);
  assert.equal(calls.length, 1);

  time = 1001;
  failing = false;
  const second = store.request("a");
  clock.run();
  assert.equal(await second, "url-a");
  assert.equal(calls.length, 2);
});

test("만료된 주소는 없는 것으로 보고 새로 받음", async () => {
  const clock = manualSchedule();
  let time = 0;
  let round = 0;
  const fetcher: ThumbFetcher = async () => {
    round += 1;
    return { a: `url-${round}` };
  };
  const store = createThumbStore({ fetcher, schedule: clock.schedule, ttlMs: 100, now: () => time });

  const first = store.request("a");
  clock.run();
  assert.equal(await first, "url-1");
  time = 100;
  assert.equal(store.get("a"), null);
  const second = store.request("a");
  clock.run();
  assert.equal(await second, "url-2");
});

test("답이 오면 구독자에게 알림", async () => {
  const clock = manualSchedule();
  const { fetcher } = recordingFetcher(() => ({ a: "url-a" }));
  const store = createThumbStore({ fetcher, schedule: clock.schedule });
  let notified = 0;
  const unsubscribe = store.subscribe(() => {
    notified += 1;
  });

  const first = store.request("a");
  clock.run();
  await first;
  assert.equal(notified, 1);
  unsubscribe();
});
