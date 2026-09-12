"use client";

import { useCallback, useRef, useState, type UIEvent } from "react";
import { Box, HStack, ImageFrame } from "@seed-design/react";

// 글에 붙은 사진을 옆으로 넘겨 보는 자리
// 한 장이 화면 폭을 다 쓰지 않아 다음 장이 옆에 조금 걸쳐 보임
// 더 있다는 사실을 점이 아니라 사진 자체로 알림

/** 화면 폭에서 이만큼 비워 다음 장을 걸침. 두 장뿐이어도 넘길 것이 있음이 보임 */
const PEEK = "56px";

/** 한 장 폭으로 멈춰 손을 떼면 사진 경계에 섬 */
const SNAP_ROW = { scrollSnapType: "x mandatory" } as const;
const SNAP_ITEM = { scrollSnapAlign: "center" } as const;

export function PostPhotos({ urls }: { urls: string[] }) {
  const [active, setActive] = useState(0);
  const row = useRef<HTMLDivElement>(null);

  // 스크롤 위치를 한 칸 폭으로 나눠 지금 보는 장을 셈
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.clientWidth : el.clientWidth;
    setActive(Math.round(el.scrollLeft / (step || 1)));
  }, []);

  if (urls.length === 0) return null;

  // 한 장뿐이면 넘길 것이 없어 그대로 폭을 다 씀
  if (urls.length === 1) {
    return <ImageFrame ratio={4 / 3} src={urls[0]} alt="" borderRadius="r2" />;
  }

  return (
    <Box position="relative">
      {/* 좌우 여백을 뚫고 나가 첫 장이 화면 끝에서 시작하고 마지막 장도 끝까지 감 */}
      <HStack
        ref={row}
        className="rebirth-scroll-row rebirth-bleed"
        align="stretch"
        gap="x2"
        onScroll={onScroll}
        style={SNAP_ROW}
      >
        {urls.map((url, index) => (
          <Box
            key={url}
            minWidth={`calc(100% - ${PEEK})`}
            width={`calc(100% - ${PEEK})`}
            style={SNAP_ITEM}
          >
            <ImageFrame
              ratio={4 / 3}
              src={url}
              alt={index === 0 ? "" : `사진 ${index + 1}`}
              borderRadius="r2"
            />
          </Box>
        ))}
      </HStack>

      {/* 몇 장 중 몇 번째인지. 사진 위에 얹으면 밝은 사진에서 묻혀 아래에 둠 */}
      <HStack justify="center" gap="x1_5" pt="x3">
        {urls.map((url, index) => (
          <Box
            key={url}
            width="x1_5"
            height="x1_5"
            borderRadius="full"
            bg={index === active ? "fg.neutral" : "bg.neutralWeak"}
          />
        ))}
      </HStack>
    </Box>
  );
}
