"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Box, HStack, Icon, ImageFrame } from "@seed-design/react";
import IconChevronLeftLine from "@karrotmarket/react-monochrome-icon/IconChevronLeftLine";
import IconChevronRightLine from "@karrotmarket/react-monochrome-icon/IconChevronRightLine";
import { ActionButton } from "seed-design/ui/action-button";
import useEmblaCarousel from "embla-carousel-react";

import { FRAME_WIDTH } from "@/components/ui/app-frame";

// 사진 여러 장을 옆으로 넘겨 보는 자리. 커뮤니티 글과 우리 동물이 함께 씀
// 한 장이 화면 폭을 다 쓰지 않아 다음 장이 옆에 걸쳐 더 있다는 것이 보임
// 누르면 같은 방식으로 넘기는 큰 화면이 열림

// 브라우저 기본 가로 스크롤은 손가락과 휠에만 반응하고 마우스로 끄는 데는 반응하지 않음
// 스크롤 막대를 감춘 화면에서는 데스크톱에서 넘길 방법이 없어 Embla 로 끌기를 받음

/** 다음 장이 옆에 걸치는 정도. 두 장뿐이어도 넘길 것이 있음이 보임 */
const PEEK_BASIS = "82%";

/** 끈 것과 누른 것을 가르는 거리. 이보다 적게 움직이면 누른 것으로 봄 */
const TAP_SLOP = 10;

/** 점 색. 어두운 덮개 위에서는 같은 색이 묻혀 반대 색을 씀 */
const PAGE_DOT = { on: "fg.neutral", off: "bg.neutralWeak" } as const;
// fg.neutralInverted 는 테마를 따라가 어두운 모드에서는 검게 나와 어두운 덮개에 묻힘
// 덮개는 늘 어두우므로 테마와 무관하게 흰 쪽을 씀
const OVERLAY_DOT = {
  on: "palette.staticWhite",
  off: "palette.staticWhiteAlpha400",
} as const;

/** 지금 보는 장을 Embla 에서 받아 둠 */
function useSelected(api: ReturnType<typeof useEmblaCarousel>[1], start = 0) {
  const [selected, setSelected] = useState(start);

  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    return () => {
      api.off("select", sync);
    };
  }, [api]);

  return selected;
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
  const tone = onOverlay ? OVERLAY_DOT : PAGE_DOT;
  return (
    // 덮개 위에서는 아래 줄에 나란히 서므로 위 여백을 두지 않음
    <HStack justify="center" gap="x1_5" pt={onOverlay ? undefined : "x3"}>
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          width="x1_5"
          height="x1_5"
          borderRadius="full"
          bg={index === active ? tone.on : tone.off}
        />
      ))}
    </HStack>
  );
}

export function PhotoCarousel({ urls }: { urls: string[] }) {
  const many = urls.length > 1;
  // 한 장뿐이면 끌 것이 없어 Embla 를 멈춰 둠
  const [viewportRef, api] = useEmblaCarousel({
    active: many,
    align: "start",
    containScroll: "trimSnaps",
  });
  const active = useSelected(api);
  const [opened, setOpened] = useState<number | null>(null);

  // 끌어서 넘긴 뒤 손을 떼면 클릭으로 읽혀 크게 보기가 열림
  // 끄는 동안 줄이 움직였는지 보고, 움직였으면 그 클릭은 넘긴 것으로 봄
  const dragged = useRef(false);
  useEffect(() => {
    if (!api) return;
    const start = () => {
      dragged.current = false;
    };
    const move = () => {
      dragged.current = true;
    };
    api.on("pointerDown", start);
    api.on("scroll", move);
    return () => {
      api.off("pointerDown", start);
      api.off("scroll", move);
    };
  }, [api]);

  const open = useCallback((index: number) => {
    if (dragged.current) return;
    setOpened(index);
  }, []);

  if (urls.length === 0) return null;

  // 사진에 초점이 있을 때만 좌우 화살표로 넘김
  // 창 전체에서 받으면 글을 읽으려고 누른 화살표에 사진이 따라 움직임
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") api?.scrollPrev();
    if (event.key === "ArrowRight") api?.scrollNext();
  };

  return (
    <>
      <Box>
        {/* Embla 는 뷰포트에 overflow: hidden, 안쪽 줄에 display: flex 를 요구함 */}
        <Box
          ref={viewportRef}
          overflowX="hidden"
          overflowY="hidden"
          onKeyDown={many ? onKeyDown : undefined}
        >
          <HStack align="stretch" gap="x2">
            {urls.map((url, index) => (
              <Box
                key={url}
                // 줄어들면 모든 장이 한 화면에 들어가 넘칠 것이 없어짐
                flexShrink={0}
                width={many ? PEEK_BASIS : "full"}
              >
                <PhotoButton url={url} index={index} onOpen={open} />
              </Box>
            ))}
          </HStack>
        </Box>

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
  return (
    // button 은 기본이 inline-block 이라 폭을 주지 않으면 안의 사진이 자리를 못 잡음
    // 브라우저가 주는 테두리와 안쪽 여백도 지워야 사진이 프레임에 딱 맞음
    <Box
      asChild
      display="block"
      width="full"
      p="0"
      borderWidth={0}
      borderRadius="r2"
      overflowX="hidden"
      overflowY="hidden"
    >
      {/* 누르면 크게 열려 확대 커서를 씀. 끌 수 있다는 것은 옆에 걸친 다음 장이 알림 */}
      <button
        type="button"
        aria-label={`사진 ${index + 1} 크게 보기`}
        className="rebirth-zoomable"
        onClick={() => onOpen(index)}
      >
        <ImageFrame ratio={4 / 3} src={url} alt="" />
      </button>
    </Box>
  );
}

/** 사진이나 아래 표시를 누른 것인지. 이것들 위에서는 덮개를 닫지 않음 */
function isImage(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("img, button"));
}

/** 크게 보는 화면에서 한 장씩 넘기는 단추. 마우스가 있는 기기에만 나타남 */
function StepButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      className="rebirth-pointer-only"
      position="absolute"
      top="50%"
      left={side === "left" ? "0" : undefined}
      right={side === "right" ? "0" : undefined}
      p="x2"
      style={{ transform: "translateY(-50%)" }}
    >
      <ActionButton variant="neutralSolid" size="medium" layout="iconOnly" aria-label={label} onClick={onClick}>
        <Icon svg={side === "left" ? <IconChevronLeftLine /> : <IconChevronRightLine />} />
      </ActionButton>
    </Box>
  );
}

/**
 * 크게 보는 화면. 사진만 남기고 나머지는 화면 가장자리로 물러남
 * SEED 다이얼로그는 가운데 뜨는 흰 카드라 사진을 꽉 채우는 이 화면과 모양이 다름
 * 레시피가 면과 크기를 정해 두어 prop 으로 되돌리려면 전부 덮어써야 해 직접 겹침
 */
function PhotoViewer({
  urls,
  start,
  onClose,
}: {
  urls: string[];
  start: number;
  onClose: () => void;
}) {
  const many = urls.length > 1;
  // 누른 장에서 시작함
  const [viewportRef, api] = useEmblaCarousel({ active: many, startIndex: start });
  const active = useSelected(api, start);

  // 누르기 시작한 자리와 그것이 사진 위였는지. 끌어 넘긴 것과 그냥 누른 것을 가름
  const pressed = useRef<{ x: number; y: number; onImage: boolean } | null>(null);

  // 열려 있는 동안 뒤 화면이 따라 움직이지 않게 하고, 좌우 화살표로 넘기고 Esc 로 닫음
  useEffect(() => {
    // 스크롤을 맡은 요소가 html 이라 body 에 걸면 잠기지 않음
    // 자리를 그대로 둔 채 멈추려고 지금 위치에 고정하고, 닫을 때 그 자리로 되돌림
    const scroller = document.scrollingElement as HTMLElement | null;
    const offset = window.scrollY;
    const before = {
      overflow: scroller?.style.overflow ?? "",
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      select: document.body.style.userSelect,
    };

    if (scroller) scroller.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${offset}px`;
    document.body.style.width = "100%";
    // 사진을 끌 때 아래 글자가 잡혀 끌리지 않게 함
    document.body.style.userSelect = "none";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") api?.scrollPrev();
      if (event.key === "ArrowRight") api?.scrollNext();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      if (scroller) scroller.style.overflow = before.overflow;
      document.body.style.position = before.position;
      document.body.style.top = before.top;
      document.body.style.width = before.width;
      document.body.style.userSelect = before.select;
      window.scrollTo(0, offset);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, api]);

  // 포털 대상은 브라우저에만 있음. 서버에서는 덮개를 그리지 않음
  // fixed 는 창 기준이라 프레임 안에 넣을 필요가 없고, 넣으면 조상의 transform 에 기준이 바뀜
  if (typeof document === "undefined") return null;

  return createPortal(
    // 세로는 보이는 화면만큼만 덮어야 해 fixed 로 두고,
    // 가로는 프레임 폭에 맞춰 큰 화면에서 덮개가 앱보다 커 보이지 않게 함
    <Box
      role="dialog"
      aria-modal
      aria-label="사진 크게 보기"
      // 사진이 아닌 어두운 자리를 누르면 닫힘
      // 끌어서 넘긴 뒤 손을 뗀 것과 구분하려고 누른 자리에서 움직였는지 봄
      onPointerDown={(event) => {
        pressed.current = { x: event.clientX, y: event.clientY, onImage: isImage(event.target) };
      }}
      onPointerUp={(event) => {
        const from = pressed.current;
        pressed.current = null;
        if (!from || from.onImage || isImage(event.target)) return;
        const moved = Math.abs(event.clientX - from.x) + Math.abs(event.clientY - from.y);
        if (moved <= TAP_SLOP) onClose();
      }}
      position="fixed"
      top="0"
      bottom="0"
      zIndex={100}
      bg="bg.overlay"
      display="flex"
      flexDirection="column"
      // 사진과 점을 한 덩어리로 묶어 화면 가운데에 둠
      // 사진 칸만 늘리면 사진은 가운데, 점은 바닥이라 둘 사이가 벌어짐
      justifyContent="center"
      // 프레임과 같은 폭으로 화면 가운데에 둠. 값은 AppFrame 이 정한 폭 하나를 따름
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: FRAME_WIDTH,
      }}
    >
      {/* 사진과 점을 한 덩어리로 세로로 쌓음
          점을 덮개 바닥에 따로 붙이면 사진 높이에 따라 둘 사이가 멀찍이 벌어짐 */}
      <Box
        ref={viewportRef}
        // 남는 높이를 다 받으면 사진 아래가 텅 비고 점 줄이 화면 바닥까지 밀림
        // 늘리지 않고 줄이기만 해 사진 높이에 맞춰 서고, 점이 바로 아래에 붙음
        flexGrow={0}
        flexShrink={1}
        minHeight="0"
        overflowX="hidden"
        overflowY="hidden"
      >
        <HStack align="stretch">
          {urls.map((url) => (
            <HStack
              key={url}
              flexShrink={0}
              // 안쪽 여백이 폭을 넘기지 않도록 테두리 기준으로 폭을 셈
              minWidth="0"
              width="full"
              align="center"
              justify="center"
              px="x4"
              style={{ boxSizing: "border-box" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 원본 비율 그대로 화면에 맞춰야 해 프레임을 씌우지 않음 */}
              <img
                src={url}
                alt=""
                draggable={false}
                // svh 는 주소 표시줄이 보일 때의 높이라 어느 상태에서도 화면을 넘지 않음
                // dvh 로 재면 표시줄이 나와 있을 때 사진이 넘쳐 점 줄이 화면 밖으로 밀림
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: many ? "calc(100svh - 56px)" : "100svh",
                  objectFit: "contain",
                }}
              />
            </HStack>
          ))}
        </HStack>
      </Box>

      {/* 마우스로 보는 화면에는 누를 곳을 둠. 손가락으로는 넘기면 되고 사진만 가림
          hover 가 되는 기기에서만 나타나 모바일에서는 자리를 차지하지 않음 */}
      {many ? (
        <>
          <StepButton side="left" label="이전 사진" onClick={() => api?.scrollPrev()} />
          <StepButton side="right" label="다음 사진" onClick={() => api?.scrollNext()} />
        </>
      ) : null}

      {/* 몇 장 중 몇 번째인지는 점만으로 충분함. 숫자까지 두면 같은 말이 둘이 됨
          덩어리가 이미 화면 가운데에 서 있어 아래 안전 영역까지 밀어내지 않음 */}
      {many ? (
        <HStack flexShrink={0} justify="center" pt="x4">
          <Dots count={urls.length} active={active} onOverlay />
        </HStack>
      ) : null}
    </Box>,
    document.body,
  );
}
