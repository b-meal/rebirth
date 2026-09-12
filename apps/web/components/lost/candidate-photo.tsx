"use client";

import { useCallback, useEffect, useState } from "react";
import { AspectRatio, ImageFrame, Text, VStack } from "@seed-design/react";
import { ProgressCircle } from "seed-design/ui/progress-circle";

// 후보 사진, 넘길 때 지연이 없도록 다음 두 장을 미리 받아 두는 서명 URL 캐시

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
};

export function CandidatePhoto({ reportId, prefetchIds }: CandidatePhotoProps) {
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

  // 다음 카드의 사진을 미리 받음, 결과는 캐시에만 넣고 화면을 건드리지 않음
  useEffect(() => {
    for (const id of prefetchIds) {
      if (!cache.has(id)) void fetchSignedUrl(id);
    }
  }, [prefetchIds]);

  // 사진이 없어도 아래 설명과 위치로 판단할 수 있어 자리만 지키고 조용히 알림
  if (failed) {
    return (
      <AspectRatio ratio={4 / 3}>
        <VStack align="center" justify="center" height="full" borderRadius="r3" bg="bg.neutralWeak">
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            사진을 불러오지 못했어요
          </Text>
        </VStack>
      </AspectRatio>
    );
  }

  // 들어설 사진과 같은 비율로 둠. 고정 높이로 두면 사진이 오는 순간 아래가 밀림
  if (!url) {
    return (
      <AspectRatio ratio={4 / 3}>
        <VStack align="center" justify="center" height="full" borderRadius="r3" bg="bg.neutralWeak">
          <ProgressCircle size="40" tone="neutral" />
        </VStack>
      </AspectRatio>
    );
  }

  return (
    <ImageFrame
      src={url}
      alt="확인할 후보 사진"
      ratio={4 / 3}
      width="full"
      borderRadius="r3"
      onError={() => {
        // 서명 URL 이 만료되면 캐시를 비우고 다시 받음
        cache.delete(reportId);
        void fetchSignedUrl(reportId).then(apply);
      }}
    />
  );
}
