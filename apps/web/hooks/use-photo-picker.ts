"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  describePhotoError,
  processPhotoFile,
  revokePhotoPreview,
  type PhotoItem,
  type ProcessPhotoOptions,
} from "@/lib/image";

/**
 * 고른 원본을 가리키는 열쇠
 * 이름과 크기와 고친 시각이 모두 같으면 같은 파일로 봄
 * 내용을 읽어 비교하면 정확하지만 큰 사진에서 고르는 순간이 느려짐
 */
function sourceKeyOf(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export type UsePhotoPickerOptions = ProcessPhotoOptions & {
  maxCount?: number;
  onChange?: (photos: PhotoItem[]) => void;
  /** 이미 고른 사진을 또 골랐을 때. 몇 장이 걸렀는지 넘김 */
  onDuplicate?: (count: number) => void;
};

export type PhotoPickerState = {
  photos: PhotoItem[];
  maxCount: number;
  remaining: number;
  isFull: boolean;
  processing: boolean;
  error: string | null;
  addFiles: (files: Iterable<File>) => Promise<void>;
  // 기존 사진을 모두 비우고 새 파일로 교체. 전부 실패하면 기존 사진 유지
  replaceFiles: (files: Iterable<File>) => Promise<void>;
  removePhoto: (id: string) => void;
  clear: () => void;
  dismissError: () => void;
};

export function usePhotoPicker({
  maxCount = 5,
  onChange,
  onDuplicate,
  maxEdge,
  quality,
}: UsePhotoPickerOptions = {}): PhotoPickerState {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이벤트 핸들러와 언마운트 정리에서 최신 목록을 읽기 위한 참조
  const latestPhotos = useRef<PhotoItem[]>([]);
  useEffect(() => {
    latestPhotos.current = photos;
  }, [photos]);

  const onChangeRef = useRef(onChange);
  const onDuplicateRef = useRef(onDuplicate);
  useEffect(() => {
    onChangeRef.current = onChange;
    onDuplicateRef.current = onDuplicate;
  }, [onChange, onDuplicate]);
  useEffect(() => {
    onChangeRef.current?.(photos);
  }, [photos]);

  // 언마운트 시 미리보기 URL 해제
  useEffect(() => {
    return () => {
      latestPhotos.current.forEach(revokePhotoPreview);
    };
  }, []);

  const busy = useRef(false);

  const ingest = useCallback(
    async (files: Iterable<File>, replace: boolean) => {
      if (busy.current) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      busy.current = true;
      setProcessing(true);
      setError(null);

      const room = replace ? maxCount : Math.max(0, maxCount - latestPhotos.current.length);
      const accepted: PhotoItem[] = [];
      const failures: string[] = [];

      // 같은 사진을 두 번 고르면 같은 장면이 여러 칸을 차지해 자리만 줄어듦
      // 재인코딩한 파일은 이름이 바뀌므로 고르기 전 원본으로 봄
      // 갈아 끼우는 경우에는 앞의 것이 사라지므로 이번에 고른 것끼리만 봄
      const seen = new Set(replace ? [] : latestPhotos.current.map((photo) => photo.sourceKey));
      let duplicates = 0;

      try {
        for (const file of list.slice(0, room)) {
          const key = sourceKeyOf(file);
          if (seen.has(key)) {
            duplicates += 1;
            continue;
          }
          seen.add(key);
          try {
            const photo = await processPhotoFile(file, { maxEdge, quality });
            accepted.push({ ...photo, sourceKey: key });
          } catch (cause) {
            failures.push(describePhotoError(cause));
          }
        }
      } finally {
        busy.current = false;
        setProcessing(false);
      }

      if (accepted.length > 0) {
        if (replace) {
          latestPhotos.current.forEach(revokePhotoPreview);
          setPhotos(accepted);
        } else {
          setPhotos((prev) => [...prev, ...accepted]);
        }
      }

      // 같은 사진은 칸 아래 글자로 두지 않음
      // 고른 순간 화면 밖에서 벌어진 일이라 눈에 띄게 알리고 스스로 사라져야 함
      if (duplicates > 0) onDuplicateRef.current?.(duplicates);

      const notes: string[] = [];
      if (list.length > room) notes.push(`사진은 최대 ${maxCount}장까지 올릴 수 있습니다`);
      if (failures.length === 1) notes.push(failures[0]);
      if (failures.length > 1) notes.push(`${failures[0]} (외 ${failures.length - 1}건)`);
      if (notes.length > 0) setError(notes.join(" "));
    },
    [maxCount, maxEdge, quality],
  );

  const addFiles = useCallback((files: Iterable<File>) => ingest(files, false), [ingest]);
  const replaceFiles = useCallback((files: Iterable<File>) => ingest(files, true), [ingest]);

  const removePhoto = useCallback((id: string) => {
    const target = latestPhotos.current.find((photo) => photo.id === id);
    if (target) revokePhotoPreview(target);
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const clear = useCallback(() => {
    latestPhotos.current.forEach(revokePhotoPreview);
    setPhotos([]);
    setError(null);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({
      photos,
      maxCount,
      remaining: Math.max(0, maxCount - photos.length),
      isFull: photos.length >= maxCount,
      processing,
      error,
      addFiles,
      replaceFiles,
      removePhoto,
      clear,
      dismissError,
    }),
    [photos, maxCount, processing, error, addFiles, replaceFiles, removePhoto, clear, dismissError],
  );
}
