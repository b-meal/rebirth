// 축소 사진 URL 을 화면에 든 제보만 묶어 받아 두는 장부
// 홈은 마커 1,400 건을 한 번에 받는데 서명 URL 하나가 550자라 사진 주소가 페이로드의 절반을 넘음
// 주소는 핀과 카드가 실제로 그려질 때 제보 id 로 묶어 받고, 같은 틱에 들어온 요청은 한 번에 보냄

export type ThumbFetcher = (ids: string[]) => Promise<Record<string, string | null>>;

export type ThumbStoreOptions = {
  fetcher: ThumbFetcher;
  /** 한 요청에 담는 id 수 */
  batchSize?: number;
  /** 받은 주소를 들고 있는 시간. 서명 유효기간보다 짧게 둠 */
  ttlMs?: number;
  /** 실패한 id 를 다시 묻기 전에 기다리는 시간 */
  retryMs?: number;
  /** 같은 틱의 요청을 모으는 예약. 기본은 마이크로태스크 */
  schedule?: (flush: () => void) => void;
  now?: () => number;
};

export type ThumbStore = {
  /** 지금 아는 주소. 없거나 만료됐으면 null */
  get: (id: string) => string | null;
  /** 주소를 묻고 결과를 돌려줌. 이미 알면 바로 풀림 */
  request: (id: string) => Promise<string | null>;
  subscribe: (listener: () => void) => () => void;
};

type Entry = { url: string | null; expiresAt: number };
type Deferred = { promise: Promise<string | null>; resolve: (url: string | null) => void };

// 서명 유효기간 12시간 중 화면에 떠 있는 동안 만료되지 않게 한 시간을 남김
const DEFAULT_TTL_MS = 11 * 60 * 60_000;
const DEFAULT_RETRY_MS = 30_000;
const DEFAULT_BATCH = 60;

function deferred(): Deferred {
  let resolve: Deferred["resolve"] = () => {};
  const promise = new Promise<string | null>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function createThumbStore({
  fetcher,
  batchSize = DEFAULT_BATCH,
  ttlMs = DEFAULT_TTL_MS,
  retryMs = DEFAULT_RETRY_MS,
  schedule = (flush) => queueMicrotask(flush),
  now = () => Date.now(),
}: ThumbStoreOptions): ThumbStore {
  const cache = new Map<string, Entry>();
  // 물어봤지만 아직 답이 오지 않은 id. 대기열에 있는 것과 요청이 나간 것을 함께 담음
  const waiting = new Map<string, Deferred>();
  const queued = new Set<string>();
  const listeners = new Set<() => void>();
  let scheduled = false;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const get = (id: string) => {
    const hit = cache.get(id);
    if (!hit || hit.expiresAt <= now()) return null;
    return hit.url;
  };

  const fetchBatch = async (ids: string[]) => {
    try {
      const result = await fetcher(ids);
      const expiresAt = now() + ttlMs;
      for (const id of ids) cache.set(id, { url: result[id] ?? null, expiresAt });
    } catch {
      // 한 번 실패한 묶음은 잠시 null 로 두어 그리는 쪽이 같은 요청을 되풀이하지 않게 함
      const expiresAt = now() + retryMs;
      for (const id of ids) cache.set(id, { url: null, expiresAt });
    }
    for (const id of ids) {
      waiting.get(id)?.resolve(get(id));
      waiting.delete(id);
    }
    notify();
  };

  const flush = () => {
    scheduled = false;
    const ids = Array.from(queued);
    queued.clear();
    for (let start = 0; start < ids.length; start += batchSize) {
      void fetchBatch(ids.slice(start, start + batchSize));
    }
  };

  const request = (id: string) => {
    const hit = cache.get(id);
    if (hit && hit.expiresAt > now()) return Promise.resolve(hit.url);

    let pending = waiting.get(id);
    if (pending) return pending.promise;
    pending = deferred();
    waiting.set(id, pending);
    queued.add(id);
    if (!scheduled) {
      scheduled = true;
      schedule(flush);
    }
    return pending.promise;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { get, request, subscribe };
}
