"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  AspectRatio,
  Box,
  Button,
  Flex,
  IconButton,
  Menu,
  Portal,
  ScrollArea,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { AppBar, AppBarAction } from "@/components/ui/app-bar";
import { CtaBar } from "@/components/ui/cta-bar";
import { Icon } from "@/components/ui/icons";
import { ListItem } from "@/components/ui/list-item";
import { ScrollRow } from "@/components/ui/screen";

import { Demo, Spec, SpecTable, Token, Usage } from "./spec";

// 배치와 스크롤을 다루는 절, 여백과 안전 영역을 어디서 한 번만 정하는지 함께 보여 줌

const RATIOS = [
  { label: "1 / 1", ratio: 1, use: "프로필과 정사각 썸네일" },
  { label: "4 / 3", ratio: 4 / 3, use: "제보 사진 기본" },
  { label: "16 / 9", ratio: 16 / 9, use: "지도와 영상" },
];

const POLICY = [
  "다시집은 발견동물 제보에 필요한 최소한의 정보만 받습니다. 사진과 발견 시각, 발견 위치, 보호 상황이 그 범위입니다.",
  "공개 목록과 공유 카드에는 행정동까지만 보입니다. 제보할 때 고른 위치는 발견 동물과 제보자를 보호하려고 공개 화면에 내보내지 않습니다.",
  "사진에서 뽑은 특징 문구는 AI 초안이며 제보자가 언제든 고칠 수 있습니다. 품종은 단정하지 않고 계열 추정으로만 적습니다.",
  "다른 제보와 비슷한 특징이 겹치면 확인할 후보로 묶어 보여 줍니다. 같은 개체로 확정하지 않으며 확인은 제보자와 보호소가 합니다.",
  "제보자가 삭제를 요청하면 사진과 위치를 함께 지웁니다. 지운 뒤에는 후보 목록에서도 빠집니다.",
];

const NEARBY = [
  { area: "연남동", count: 12 },
  { area: "성산동", count: 9 },
  { area: "망원동", count: 7 },
  { area: "합정동", count: 5 },
  { area: "서교동", count: 4 },
];

const STICKY_GROUPS = [
  {
    area: "연남동",
    items: ["흰색 소형견, 말티즈 계열 추정", "검정 중형견, 믹스로 보임", "삼색 고양이, 성묘로 보임"],
  },
  {
    area: "성산동",
    items: ["갈색 중형견, 진돗개 계열 추정", "회색 고양이, 어린 개체로 보임", "흰색 대형견, 목줄 있음"],
  },
  {
    area: "망원동",
    items: ["노란 소형견, 포메라니안 계열 추정", "검정 고양이, 한쪽 귀 잘림", "갈색 소형견, 절뚝임"],
  },
];

const MASONRY = [
  { area: "연남동", height: 124 },
  { area: "성산동", height: 88 },
  { area: "망원동", height: 148 },
  { area: "합정동", height: 96 },
  { area: "서교동", height: 116 },
  { area: "상암동", height: 76 },
];

const OVERFLOW_ITEMS = [
  { value: "copy", label: "링크 복사", icon: "copy" as const },
  { value: "download", label: "사진 저장", icon: "download" as const },
  { value: "report", label: "잘못된 제보 신고", icon: "flag" as const },
];

const PULL_ROWS = [
  { title: "흰색 소형견, 말티즈 계열 추정", area: "연남동" },
  { title: "갈색 중형견, 진돗개 계열 추정", area: "성산동" },
  { title: "삼색 고양이, 성묘로 보임", area: "망원동" },
  { title: "검정 고양이, 한쪽 귀 잘림", area: "합정동" },
  { title: "노란 소형견, 포메라니안 계열 추정", area: "서교동" },
  { title: "회색 고양이, 어린 개체로 보임", area: "상암동" },
];

const PULL_MAX = 72;
const PULL_TRIGGER = 48;
const STICKY_TOP = "calc(var(--chakra-sizes-appBar) + var(--chakra-spacing-safeTop))";

function PullToRefresh() {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const startRef = useRef<number | null>(null);

  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (phase !== "idle" || event.currentTarget.scrollTop > 0) return;
    startRef.current = event.clientY;
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (startRef.current === null) return;
    setOffset(Math.min(PULL_MAX, Math.max(0, event.clientY - startRef.current)));
  };

  const end = () => {
    if (startRef.current === null) return;
    startRef.current = null;
    const pulled = offset;
    setOffset(0);
    if (pulled < PULL_TRIGGER) return;
    setPhase("loading");
    window.setTimeout(() => setPhase("done"), 600);
    window.setTimeout(() => setPhase("idle"), 1800);
  };

  const rail = phase === "idle" ? offset : 40;
  const message =
    phase === "done"
      ? "새로고침했습니다"
      : phase === "loading"
        ? "새로고침 중"
        : offset >= PULL_TRIGGER
          ? "놓으면 새로고침"
          : "당겨서 새로고침";

  return (
    <Box
      width="100%"
      height="220px"
      overflowY="auto"
      overscrollBehavior="contain"
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <Flex
        height={`${rail}px`}
        align="center"
        justify="center"
        gap="2"
        overflow="hidden"
        color={phase === "done" ? "brand.fg" : "fg.assistive"}
        transition={phase === "idle" ? undefined : "height 0.15s"}
      >
        {phase === "loading" ? <Spinner size="xs" /> : null}
        <Text textStyle="caption">{message}</Text>
      </Flex>
      {PULL_ROWS.map((row) => (
        <ListItem key={row.title} title={row.title} description={row.area} chevron truncate />
      ))}
    </Box>
  );
}

export function LayoutCatalog() {
  return (
    <>
      <Spec
        id="aspect-ratio"
        title="Aspect Ratio"
        description="사진 자리를 미리 잡아 이미지가 늦게 와도 화면이 밀리지 않게 합니다. 비율은 세 개만 씁니다."
      >
        <Demo label="ratio" note="사진은 4/3 기본입니다. 지도 미리보기만 16/9 를 씁니다">
          {RATIOS.map((item) => (
            <Flex key={item.label} direction="column" gap="1.5" width="200px">
              <AspectRatio ratio={item.ratio}>
                <Flex
                  align="center"
                  justify="center"
                  backgroundColor="brand.muted"
                  color="brand.fg"
                  borderRadius="card"
                >
                  <Icon name="image" size={24} />
                </Flex>
              </AspectRatio>
              <Text textStyle="caption" color="fg.assistive">
                {item.label} {item.use}
              </Text>
            </Flex>
          ))}
        </Demo>

        <SpecTable
          rows={[
            ["1 / 1", "프로필과 목록 썸네일"],
            ["4 / 3", "제보 사진 기본값"],
            ["16 / 9", "지도 미리보기와 영상"],
            ["모서리", <Token key="radius">radii.card</Token>],
          ]}
        />

        <Usage code={`<AspectRatio ratio={4 / 3}>{photo}</AspectRatio>`} />
      </Spec>

      <Spec
        id="scroll-area"
        title="Scroll Area"
        description="긴 글을 화면 안에 가두고 싶을 때만 씁니다. 모바일 기본은 네이티브 스크롤이고 스크롤 막대를 따로 그리지 않습니다."
      >
        <Demo label="세로 스크롤" note="약관과 처리방침처럼 화면을 떠나지 않고 읽는 글에 씁니다">
          <ScrollArea.Root
            width="100%"
            maxHeight="200px"
            borderWidth="1px"
            borderColor="border.muted"
            borderRadius="control"
            backgroundColor="bg.canvas"
          >
            <ScrollArea.Viewport>
              <ScrollArea.Content paddingInline="3.5" paddingBlock="3">
                <Flex direction="column" gap="3">
                  {POLICY.map((paragraph) => (
                    <Text key={paragraph.slice(0, 12)} textStyle="bodySm" color="fg.alternative">
                      {paragraph}
                    </Text>
                  ))}
                </Flex>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar>
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Demo>

        <Demo
          label="가로 스크롤"
          variant="screen"
          note="ScrollRow 는 화면 여백을 넘겨 가장자리까지 흐르게 하고 막대를 숨깁니다"
        >
          <Box paddingInline="screen" paddingBlock="3" width="100%">
            <ScrollRow>
              {NEARBY.map((item) => (
                <Flex
                  key={item.area}
                  direction="column"
                  gap="1"
                  width="112px"
                  padding="3"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="card"
                  backgroundColor="bg.panel"
                >
                  <Text textStyle="label" truncate>
                    {item.area}
                  </Text>
                  <Text textStyle="caption" color="fg.assistive">
                    제보 {item.count}건
                  </Text>
                </Flex>
              ))}
            </ScrollRow>
          </Box>
        </Demo>

        <SpecTable
          rows={[
            ["기본", "네이티브 스크롤, 막대를 그리지 않음"],
            ["ScrollArea", "화면 안에 글을 가둘 때만, 최대 높이를 함께 지정"],
            ["ScrollRow", "좌우 screen 여백을 음수 마진으로 상쇄해 가장자리까지 흐름"],
            ["가로 스크롤", "칩과 카드 나열에만, 본문 글에는 쓰지 않음"],
          ]}
        />
      </Spec>

      <Spec
        id="sticky"
        title="Sticky"
        description="상단 바와 하단 버튼, 절 제목은 스크롤과 무관하게 자리를 지킵니다. 겹치는 순서는 z-index 토큰으로만 정합니다."
      >
        <Demo
          label="한 화면에 세 층"
          variant="screen"
          note="상단 바는 0, 절 제목은 상단 바 높이만큼 내려 붙고, 버튼은 아래에 남습니다"
        >
          <Box width="100%" height="320px" overflowY="auto" position="relative">
            <AppBar
              title="주변 제보"
              leading={<AppBarAction icon="back" label="뒤로" />}
              actions={<AppBarAction icon="search" label="검색" />}
            />
            {STICKY_GROUPS.map((group) => (
              <Box key={group.area}>
                <Box
                  position="sticky"
                  top={STICKY_TOP}
                  zIndex="docked"
                  backgroundColor="bg.canvas"
                  borderBottomWidth="1px"
                  borderColor="border.muted"
                  paddingInline="screen"
                  paddingBlock="2"
                >
                  <Text textStyle="overline" color="fg.assistive">
                    {group.area}
                  </Text>
                </Box>
                {group.items.map((item) => (
                  <ListItem key={item} title={item} description={group.area} chevron truncate />
                ))}
              </Box>
            ))}
            <CtaBar helper="공개 목록에는 행정동까지만 보입니다">
              <Button>확인할 후보 보기</Button>
            </CtaBar>
          </Box>
        </Demo>

        <SpecTable
          rows={[
            ["sticky", "1100, AppBar 와 상단에 붙는 검색 바"],
            ["docked", "10, TabBar 와 CtaBar 와 절 제목"],
            ["overlay", "1300, 시트와 대화상자의 뒤 배경"],
            [
              "절 제목 top",
              <Token key="sticky-top">calc(sizes.appBar + spacing.safeTop)</Token>,
            ],
          ]}
        />
      </Spec>

      <Spec
        id="masonry"
        title="Masonry"
        description="높이가 다른 사진을 두 열로 채워 빈 자리를 줄입니다. 사진 목록에만 씁니다. 글이 섞인 목록은 읽는 순서가 흐트러지므로 쓰지 않습니다."
      >
        <Demo label="2열" note="CSS columns 로 채우므로 순서는 위에서 아래, 왼쪽 열이 먼저입니다">
          <Box width="100%" css={{ columns: 2, columnGap: "8px" }}>
            {MASONRY.map((item) => (
              <Box key={item.area} marginBottom="2" css={{ breakInside: "avoid" }}>
                <Flex
                  height={`${item.height}px`}
                  direction="column"
                  align="center"
                  justify="center"
                  gap="1"
                  borderRadius="card"
                  backgroundColor="brand.muted"
                  color="brand.fg"
                >
                  <Icon name="image" size={22} />
                  <Text textStyle="caption">{item.area}</Text>
                </Flex>
              </Box>
            ))}
          </Box>
        </Demo>

        <SpecTable
          rows={[
            ["열", "2 고정, 좁은 폭에서 세 열은 사진이 너무 작아짐"],
            ["간격", "가로 8, 세로 8"],
            ["끊김 방지", "자식마다 breakInside avoid"],
            ["쓰는 곳", "사진 목록만, 글이 섞인 목록은 한 열로 둠"],
          ]}
        />
      </Spec>

      <Spec
        id="overflow-menu"
        title="Overflow Menu"
        description="화면 폭이 좁으면 3개까지 보이고 나머지는 메뉴로 접습니다. 자주 쓰는 것을 앞에 두고 되돌리기 어려운 것은 메뉴 안으로 넣습니다."
      >
        <Demo label="상단 바 오른쪽" note="더보기는 항상 마지막 자리에 두어 위치를 외울 수 있게 합니다">
          <Flex align="center" gap="0" justify="flex-end" width="100%">
            <AppBarAction icon="share" label="공유" />
            <AppBarAction icon="bookmark" label="저장" />
            <AppBarAction icon="bell" label="알림 받기" />
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton variant="ghost" colorPalette="gray" aria-label="더보기" size="lg">
                  <Icon name="more" size={24} />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    {OVERFLOW_ITEMS.map((item) => (
                      <Menu.Item key={item.value} value={item.value}>
                        <Icon name={item.icon} size={18} />
                        {item.label}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Flex>
        </Demo>

        <SpecTable
          rows={[
            ["보이는 개수", "3개까지, 더보기를 포함하면 4자리"],
            ["순서", "자주 쓰는 것부터, 삭제와 신고는 메뉴 안"],
            ["터치 영역", <Token key="touch">sizes.touch</Token>],
            ["라벨", "아이콘만 보이는 버튼에도 aria-label 필수"],
          ]}
        />
      </Spec>

      <Spec
        id="safe-area"
        title="Safe Area"
        description="노치와 홈 인디케이터에 내용이 가리지 않도록 화면 위아래에 기기 여백을 더합니다. 값은 두 토큰으로만 부릅니다."
      >
        <Demo label="기기 여백" note="브라우저에서 안전 영역이 없으면 두 값 모두 0 이 됩니다">
          <Flex justify="center" width="100%">
            <Box
              width="180px"
              borderWidth="2px"
              borderColor="border.emphasized"
              borderRadius="24px"
              overflow="hidden"
              backgroundColor="bg.canvas"
            >
              <Flex
                height="44px"
                align="center"
                justify="center"
                backgroundColor="brand.muted"
                color="brand.fg"
              >
                <Text textStyle="overline">safeTop 노치</Text>
              </Flex>
              <Flex height="132px" align="center" justify="center" backgroundColor="bg.subtle">
                <Text textStyle="caption" color="fg.assistive">
                  본문
                </Text>
              </Flex>
              <Flex
                height="34px"
                align="center"
                justify="center"
                backgroundColor="brand.muted"
                color="brand.fg"
              >
                <Text textStyle="overline">safeBottom 홈</Text>
              </Flex>
            </Box>
          </Flex>
        </Demo>

        <SpecTable
          rows={[
            ["spacing.safeTop", <Token key="top">env(safe-area-inset-top, 0px)</Token>],
            ["spacing.safeBottom", <Token key="bottom">env(safe-area-inset-bottom, 0px)</Token>],
            ["AppBar", "paddingTop safeTop 을 이미 적용"],
            ["TabBar", "paddingBottom safeBottom 을 이미 적용"],
            ["CtaBar", "paddingBottom safeBottom 을 이미 적용"],
            ["BottomSheet", "paddingBottom safeBottom 을 이미 적용"],
          ]}
        />

        <Usage code={`<Box paddingBottom="safeBottom">{actions}</Box>`} />
      </Spec>

      <Spec
        id="pull-refresh"
        title="Pull to Refresh"
        description="목록 맨 위에서 아래로 당기면 다시 불러옵니다. 새로고침 버튼을 따로 두지 않아도 되는 목록에만 붙입니다."
      >
        <Demo
          label="당겨서 새로고침"
          variant="screen"
          note="맨 위에서 아래로 끌어 보십시오. 48 이상 당긴 뒤 놓으면 다시 불러옵니다"
        >
          <PullToRefresh />
        </Demo>

        <SpecTable
          rows={[
            ["시작 조건", "scrollTop 이 0 일 때만 당김을 받음"],
            ["임계값", "48 이상 당긴 뒤 놓으면 실행, 최대 72 까지만 늘어남"],
            ["상태", "당겨서 새로고침, 놓으면 새로고침, 새로고침 중, 새로고침했습니다"],
            ["결과 표시", "완료 문구를 1.2초 두고 사라짐"],
            ["구현", "onPointerDown 과 Move 와 Up 으로 offset 을 계산하고 음수는 잘라냄"],
          ]}
        />
      </Spec>
    </>
  );
}
