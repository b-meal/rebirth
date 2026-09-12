"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import { Box, ContentDialog, HStack, Icon, ImageFrame, Text } from "@seed-design/react";
import IconXmarkLine from "@karrotmarket/react-monochrome-icon/IconXmarkLine";

// 글에 붙은 사진을 옆으로 넘겨 보는 자리
// 한 장이 화면 폭을 다 쓰지 않아 다음 장이 옆에 걸쳐 더 있다는 것이 보임
// 누르면 같은 방식으로 넘기는 큰 화면이 열림

/** 화면 폭에서 이만큼 비워 다음 장을 걸침. 두 장뿐이어도 넘길 것이 있음이 보임 */
const PEEK = "56px";

/** 한 장 폭으로 멈춰 손을 떼면 사진 경계에 섬 */
const SNAP_ROW = { scrollSnapType: "x mandatory" } as const;
const SNAP_ITEM = { scrollSnapAlign: "center" } as const;

/** 끈 것과 누른 것을 가르는 거리. 이보다 적게 움직이면 누른 것으로 봄 */
const TAP_SLOP = 10;

/** 점 색. 어두운 덮개 위에서는 같은 색이 묻혀 반대 색을 씀 */
const PAGE_DOT = { on: "fg.neutral", off: "bg.neutralWeak" } as const;
const OVERLAY_DOT = { on: "fg.neutralInverted", off: "bg.neutralWeakAlpha" } as const;

/** 스크롤 위치를 한 칸 폭으로 나눠 지금 보는 장을 셈 */
function useActiveIndex() {
  const [active, setActive] = useState(0);
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.clientWidth : el.clientWidth;
    setActive(Math.round(el.scrollLeft / (step || 1)));
  }, []);
  return { active, setActive, onScroll };
}

/** 몇 장 중 몇 번째인지 */
function Dots({
  count,
  active,
  onOverlay = false,
}: {
  count: number;
  active: number;
  onOverlay?: boolean;
}) {
  return (
    <HStack justify="center" gap="x1_5" pt="x3">
      {Array.from({ length: count }, (_, index) => {
        const tone = onOverlay ? OVERLAY_DOT : PAGE_DOT;
        return (
          <Box
            key={index}
            width="x1_5"
            height="x1_5"
            borderRadius="full"
            bg={index === active ? tone.on : tone.off}
          />
        );
      })}
    </HStack>
  );
}

export function PostPhotos({ urls }: { urls: string[] }) {
  const { active, onScroll } = useActiveIndex();
  const [opened, setOpened] = useState<number | null>(null);

  if (urls.length === 0) return null;

  const many = urls.length > 1;

  return (
    <>
      <Box position="relative">
        {/* 좌우 여백을 뚫고 나가 첫 장이 화면 끝에서 시작하고 마지막 장도 끝까지 감 */}
        <HStack
          className="rebirth-scroll-row rebirth-bleed"
          align="stretch"
          gap="x2"
          onScroll={onScroll}
          style={many ? SNAP_ROW : undefined}
        >
          {urls.map((url, index) => (
            <Box
              key={url}
              // 줄어들면 모든 장이 한 화면에 들어가 넘칠 것이 없어져 스크롤이 생기지 않음
              flexShrink={0}
              // 한 장뿐이면 걸칠 다음 장이 없어 폭을 다 씀
              width={many ? `calc(100% - ${PEEK})` : "full"}
              style={SNAP_ITEM}
            >
              <PhotoButton url={url} index={index} onOpen={setOpened} />
            </Box>
          ))}
        </HStack>

        {many ? <Dots count={urls.length} active={active} /> : null}
      </Box>

      {opened !== null ? (
        <PhotoViewer urls={urls} start={opened} onClose={() => setOpened(null)} />
      ) : null}
    </>
  );
}

function PhotoButton({
  url,
  index,
  onOpen,
}: {
  url: string;
  index: number;
  onOpen: (index: number) => void;
}) {
  // 끌어서 넘긴 뒤 손을 떼도 클릭으로 읽혀, 움직인 거리로 끈 것과 누른 것을 가름
  const from = useRef<{ x: number; y: number } | null>(null);

  return (
    <Box asChild borderRadius="r2" overflowX="hidden" overflowY="hidden">
      <button
        type="button"
        aria-label={`사진 ${index + 1} 크게 보기`}
        onPointerDown={(event) => {
          from.current = { x: event.clientX, y: event.clientY };
        }}
        onClick={(event) => {
          const start = from.current;
          from.current = null;
          if (start) {
            const moved = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
            // 끌어서 넘긴 것이면 열지 않음
            if (moved > TAP_SLOP) return;
          }
          onOpen(index);
        }}
      >
        <ImageFrame ratio={4 / 3} src={url} alt="" />
      </button>
    </Box>
  );
}

/** 크게 보는 화면. 목록과 같은 방식으로 옆으로 넘김 */
function PhotoViewer({
  urls,
  start,
  onClose,
}: {
  urls: string[];
  start: number;
  onClose: () => void;
}) {
  const { active, setActive, onScroll } = useActiveIndex();
  const row = useRef<HTMLDivElement>(null);

  // 누른 장에서 시작함. 스크롤로 옮기므로 첫 그림 뒤에 한 번만 함
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    el.scrollLeft = el.clientWidth * start;
    setActive(start);
  }, [start, setActive]);

  const many = urls.length > 1;

  return (
    <ContentDialog.Root open onOpenChange={(next) => !next && onClose()}>
      <ContentDialog.Positioner>
        <ContentDialog.Backdrop />
        {/* 사진만 남도록 덮개를 화면 전체로 펴고 테두리와 여백을 두지 않음 */}
        <ContentDialog.Content asChild aria-label="사진 크게 보기">
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            display="flex"
            flexDirection="column"
            bg="bg.overlay"
            // 카드 모양을 지우는 값은 SEED prop 에 없어 style 로 넘김
            style={{ maxWidth: "none", margin: 0, padding: 0, border: "none", borderRadius: 0 }}
          >
            <HStack justify="space-between" align="center" p="x4">
              <Text textStyle="t5Bold" color="fg.neutralInverted">
                {active + 1} / {urls.length}
              </Text>
              <ContentDialog.CloseButton aria-label="닫기">
                <Icon svg={<IconXmarkLine />} color="fg.neutralInverted" />
              </ContentDialog.CloseButton>
            </HStack>

            <HStack
              ref={row}
              className="rebirth-scroll-row"
              grow={1}
              minHeight="0"
              align="center"
              onScroll={onScroll}
              style={many ? SNAP_ROW : undefined}
            >
              {urls.map((url) => (
                <Box
                  key={url}
                  flexShrink={0}
                  width="full"
                  height="full"
                  display="flex"
                  alignItems="center"
                  px="x4"
                  style={SNAP_ITEM}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 원본 비율 그대로 화면에 맞춰야 해 프레임을 씌우지 않음 */}
                  <img
                    src={url}
                    alt=""
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      margin: "0 auto",
                    }}
                  />
                </Box>
              ))}
            </HStack>

            {many ? (
              <Box pb="x6">
                <Dots count={urls.length} active={active} onOverlay />
              </Box>
            ) : null}
          </Box>
        </ContentDialog.Content>
      </ContentDialog.Positioner>
    </ContentDialog.Root>
  );
}
