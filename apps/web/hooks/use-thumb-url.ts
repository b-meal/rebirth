"use client";

import { useEffect, useSyncExternalStore } from "react";

import { createThumbStore } from "@/lib/thumb-store";

// 카드와 핀이 사진 주소를 얻는 한 길
// 서버가 주소를 이미 넣어 준 화면은 그대로 쓰고, 홈처럼 id 만 받은 화면은 그려질 때 묶어서 받음

export type ThumbSource = {
  id: string;
  photoUrl: string | null;
  /** 사진은 있지만 주소는 화면에 들 때 받음. 홈 마커가 이 길을 씀 */
  photoLazy?: boolean;
};

async function fetchThumbs(ids: string[]): Promise<Record<string, string | null>> {
  const response = await fetch(`/api/thumbs?ids=${ids.join(",")}`);
  if (!response.ok) throw new Error(`thumbs ${response.status}`);
  const body = (await response.json()) as { thumbs: Record<string, string | null> };
  return body.thumbs;
}

// 모듈 하나가 장부 하나. 화면을 오가도 받은 주소가 남아 같은 제보를 되묻지 않음
const store = createThumbStore({ fetcher: fetchThumbs });

/** 사진이 있는 제보인지. 주소가 있든 나중에 받든 같음 */
export function hasPhoto(item: ThumbSource | null | undefined): boolean {
  return Boolean(item && (item.photoUrl || item.photoLazy));
}

const noServerSnapshot = () => null;

export function useThumbUrl(item: ThumbSource | null | undefined): string | null {
  const lazy = Boolean(item && !item.photoUrl && item.photoLazy);
  const id = item?.id ?? null;
  const fromStore = useSyncExternalStore(
    store.subscribe,
    () => (lazy && id ? store.get(id) : null),
    noServerSnapshot,
  );
  useEffect(() => {
    if (lazy && id) void store.request(id);
  }, [lazy, id]);
  return item?.photoUrl ?? fromStore;
}

/** 곧 화면에 들 제보의 사진을 미리 받아 둠. 주소를 모르면 먼저 묻고 오면 받음 */
export function prefetchThumb(item: ThumbSource): void {
  if (typeof Image === "undefined") return;
  const load = (url: string | null) => {
    if (!url) return;
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = url;
  };
  if (item.photoUrl) {
    load(item.photoUrl);
    return;
  }
  if (item.photoLazy) void store.request(item.id).then(load);
}
