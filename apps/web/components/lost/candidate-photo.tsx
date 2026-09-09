"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Image, Skeleton } from "@chakra-ui/react";

import { SectionMessage } from "@/components/ui/section-message";

// 후보 사진. 비공개 버킷이라 서명 URL 로만 노출
// 넘길 때마다 발급을 기다리면 지연이 생기므로 다음 두 장을 미리 받아 둠

// 발급한 URL 을 컴포넌트 밖에 두어 카드를 넘겨도 다시 받지 않음
const cache = new Map<string, string>();

async function fetchSignedUrl(reportId: string): Promise<string | null> {
  const cached = cache.get(reportId);
  if (cached) return cached;
  try {
    const response = await fetch(`/api/reports/${reportId}/photo`);
    if (!response.ok) return null;
    const body = (await response.json()) as { photos?: { url: string }[] };
    const url = body.photos?.[0]?.url ?? null;
    if (url) cache.set(reportId, url);
    return url;
  } catch {
    return null;
  }
}

export type CandidatePhotoProps = {
  reportId: string;
  prefetchIds: string[];
  reduceMotion: boolean;
};

export function CandidatePhoto({
  reportId,
  prefetchIds,
  reduceMotion,
}: CandidatePhotoProps) {
  const [url, setUrl] = useState<string | null>(() => cache.get(reportId) ?? null);
  const [failed, setFailed] = useState(false);

  const apply = useCallback((next: string | null) => {
    setUrl(next);
    setFailed(next === null);
  }, []);

  useEffect(() => {
    // 캐시에 있으면 초기값으로 이미 들어와 있어 아무것도 하지 않음
    if (cache.has(reportId)) return;
    let cancelled = false;
    void fetchSignedUrl(reportId).then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [reportId, apply]);

  // 다음 카드의 사진을 미리 받음. 결과는 캐시에만 넣고 화면을 건드리지 않음
  useEffect(() => {
    for (const id of prefetchIds) {
      if (!cache.has(id)) void fetchSignedUrl(id);
    }
  }, [prefetchIds]);

  if (failed) {
    return <SectionMessage variant="info">사진을 불러오지 못했습니다</SectionMessage>;
  }

  if (!url) return <Skeleton width="100%" height="280px" />;

  return (
    <Box
      borderRadius="card"
      overflow="hidden"
      // 전환 애니메이션은 접근성 설정을 따름
      transition={reduceMotion ? "none" : "opacity 160ms ease-out"}
    >
      <Image
        src={url}
        alt="확인할 후보 사진"
        width="100%"
        aspectRatio="4 / 3"
        objectFit="cover"
        display="block"
        onError={() => {
          // 서명 URL 이 만료되면 캐시를 비우고 다시 받음
          cache.delete(reportId);
          void fetchSignedUrl(reportId).then(apply);
        }}
      />
    </Box>
  );
}
