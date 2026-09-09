"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  describePhotoError,
  processPhotoFile,
  revokePhotoPreview,
  type PhotoItem,
  type ProcessPhotoOptions,
} from "../lib/image";

export type UsePhotoPickerOptions = ProcessPhotoOptions & {
  maxCount?: number;
  onChange?: (photos: PhotoItem[]) => void;
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
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
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

      try {
        for (const file of list.slice(0, room)) {
          try {
            accepted.push(await processPhotoFile(file, { maxEdge, quality }));
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
