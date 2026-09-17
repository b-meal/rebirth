"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PhotoItem } from "@/lib/image";

// 여러 장을 각자 올려 참조를 모아 두는 자리
// use-photo-upload 는 대표 사진 한 장을 다루느라 새로 올릴 때 앞의 것을 끊음
// 커뮤니티 글은 여러 장이 함께 남아야 해 장마다 따로 올리고 결과를 사진 id 로 묶음

const FAILED = "사진을 올리지 못했어요. 다시 골라 주세요";

export type PhotoUploadsState = {
  /** 아직 올리는 중인 장이 있는지. 저장 버튼을 잠그는 기준 */
  uploading: boolean;
  /** 한 장이라도 실패했는지 */
  message: string | null;
  /** 저장에 실어 보낼 참조. 고른 순서를 지킴 */
  uploadIds: string[];
  /** 고른 사진이 바뀔 때마다 부름. 새로 들어온 장만 올리고 빠진 장은 잊음 */
  sync: (photos: PhotoItem[]) => void;
};

export function usePhotoUploads(): PhotoUploadsState {
  const [ids, setIds] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  // 지금 화면에 있는 사진 순서. 참조를 이 순서로 내보냄
  const [order, setOrder] = useState<string[]>([]);

  // 같은 장을 두 번 올리지 않도록 이미 손댄 id 를 들고 있음
  const started = useRef<Set<string>>(new Set());

  // 개발 모드의 이중 마운트에서는 정리가 먼저 돌아 false 로 굳음
  // 그러면 그 뒤 도착한 응답을 전부 버려 올리는 중 표시가 풀리지 않음
  // 붙을 때마다 다시 켜서 두 번째 마운트가 결과를 받게 함
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const sync = useCallback((photos: PhotoItem[]) => {
    setOrder(photos.map((photo) => photo.id));

    for (const photo of photos) {
      if (started.current.has(photo.id)) continue;
      started.current.add(photo.id);

      setPending((count) => count + 1);
      const body = new FormData();
      body.append("photo", photo.file);

      void fetch("/api/draft/uploads", { method: "POST", body })
        .then(async (response) => {
          const payload = (await response.json()) as { uploadId?: string; message?: string };
          if (!alive.current) return;
          if (!response.ok || !payload.uploadId) {
            setMessage(payload.message ?? FAILED);
            return;
          }
          setIds((current) => ({ ...current, [photo.id]: payload.uploadId! }));
        })
        .catch(() => {
          if (alive.current) setMessage(FAILED);
        })
        .finally(() => {
          if (alive.current) setPending((count) => count - 1);
        });
    }
  }, []);

  // 화면에서 빠진 장은 참조도 빼 저장에 실리지 않게 함
  const uploadIds = order.flatMap((photoId) => (ids[photoId] ? [ids[photoId]] : []));

  return { uploading: pending > 0, message, uploadIds, sync };
}
