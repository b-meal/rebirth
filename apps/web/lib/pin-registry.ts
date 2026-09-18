// 지도 위 핀 장부를 맞추는 순수 로직
// 키가 같은 핀은 요소를 그대로 두고 값만 고쳐 지도가 움직여도 다시 마운트되지 않음
// 요소를 새로 만들면 포털 대상이 바뀌어 React 가 핀을 다시 마운트하고 사진이 한 프레임 비어 깜빡임

export type PinReconciler<E, F> = {
  /** 처음 보는 키. 요소와 마커를 만들어 돌려줌 */
  create: (feature: F) => E;
  /** 이미 있는 키. 자리나 값이 바뀌었으면 고치고 true */
  update: (entry: E, feature: F) => boolean;
  /** 실린 타일에서 벗어난 키 */
  remove: (entry: E) => void;
};

export type ReconcileResult<E> = {
  /** 이번에 보인 순서대로의 항목 */
  entries: E[];
  created: number;
  updated: number;
  removed: number;
};

/**
 * 지금 보이는 것과 장부를 맞춤. 장부는 제자리에서 고침
 * 타일 경계에 걸친 것은 두 번 올라와 같은 키는 처음 것만 봄
 */
export function reconcilePins<E, F>(
  registry: Map<string, E>,
  incoming: Iterable<{ key: string; feature: F }>,
  handlers: PinReconciler<E, F>,
): ReconcileResult<E> {
  const seen = new Set<string>();
  const entries: E[] = [];
  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const { key, feature } of incoming) {
    if (seen.has(key)) continue;
    seen.add(key);
    const existing = registry.get(key);
    if (existing === undefined) {
      const entry = handlers.create(feature);
      registry.set(key, entry);
      entries.push(entry);
      created += 1;
      continue;
    }
    if (handlers.update(existing, feature)) updated += 1;
    entries.push(existing);
  }

  for (const [key, entry] of registry) {
    if (seen.has(key)) continue;
    handlers.remove(entry);
    registry.delete(key);
    removed += 1;
  }

  return { entries, created, updated, removed };
}
