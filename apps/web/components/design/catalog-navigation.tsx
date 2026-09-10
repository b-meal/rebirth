"use client";

import { useRef, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Breadcrumb,
  Button,
  ButtonGroup,
  Circle,
  Collapsible,
  Flex,
  Float,
  IconButton,
  Link,
  Pagination,
  SegmentGroup,
  Stack,
  Steps,
  Tabs,
  Text,
  TreeView,
  createTreeCollection,
} from "@chakra-ui/react";

import { AppBar, AppBarAction } from "@/components/ui/app-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icons";
import { ListGroup, ListItem } from "@/components/ui/list-item";
import { PageIndicator } from "@/components/ui/page-indicator";
import { ScrollRow } from "@/components/ui/screen";
import { SearchBar } from "@/components/ui/search-bar";
import { StepProgress } from "@/components/ui/step-progress";
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";

import { Demo, Spec, SpecTable, ThemeStage, Token, Usage } from "./spec";

// 화면 사이와 화면 안을 오가는 컴포넌트의 배치 기준과 예시

const TAB_ITEMS: TabBarItem[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/reports", label: "제보", icon: "list" },
  { href: "/map", label: "지도", icon: "map" },
  { href: "/alerts", label: "알림", icon: "bell", badge: 3 },
  { href: "/me", label: "내 정보", icon: "user" },
];

const DOT_TAB_ITEMS: TabBarItem[] = TAB_ITEMS.map((item) =>
  item.href === "/alerts" ? { ...item, badge: true } : { ...item, badge: undefined },
);

function BellWithDot() {
  return (
    <Box position="relative">
      <AppBarAction icon="bell" label="알림" />
      <Float placement="top-end" offsetX="3.5" offsetY="3.5">
        <Circle size="2" backgroundColor="red.solid" />
      </Float>
    </Box>
  );
}

function TabBarDemo() {
  const [active, setActive] = useState("/");
  return (
    <>
      <Demo variant="row" label="활성 탭 고르기">
        <SegmentGroup.Root
          size="xs"
          value={active}
          onValueChange={(details) => setActive(details.value ?? "/")}
        >
          <SegmentGroup.Indicator />
          {TAB_ITEMS.map((item) => (
            <SegmentGroup.Item key={item.href} value={item.href}>
              <SegmentGroup.ItemText>{item.label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Demo>
      <Demo
        variant="screen"
        label="개수 배지"
        note="카탈로그 안에서는 이동을 막아 두었고 실제 화면에서는 Link 로 이동합니다."
      >
        <Box width="100%" onClickCapture={(event) => event.preventDefault()}>
          <TabBar items={TAB_ITEMS} activeHref={active} sticky={false} />
        </Box>
      </Demo>
      <Demo variant="screen" label="점 배지">
        <Box width="100%" onClickCapture={(event) => event.preventDefault()}>
          <TabBar items={DOT_TAB_ITEMS} activeHref={active} sticky={false} />
        </Box>
      </Demo>
    </>
  );
}

const TAB_PANELS = [
  { value: "all", label: "전체", body: "가까운 순서로 모든 제보를 보여 줍니다." },
  { value: "dog", label: "개", body: "개로 보이는 제보만 모았습니다." },
  { value: "cat", label: "고양이", body: "고양이로 보이는 제보만 모았습니다." },
];

const SCROLL_TABS = ["전체", "오늘", "이번 주", "반경 1km", "보호 중", "확인할 후보"];

function TabsDemo({ variant }: { variant: "line" | "subtle" | "enclosed" }) {
  return (
    <Tabs.Root defaultValue="all" variant={variant} size="sm" width="100%">
      <Tabs.List>
        {TAB_PANELS.map((panel) => (
          <Tabs.Trigger key={panel.value} value={panel.value}>
            {panel.label}
          </Tabs.Trigger>
        ))}
        {variant === "line" ? null : <Tabs.Indicator />}
      </Tabs.List>
      {TAB_PANELS.map((panel) => (
        <Tabs.Content key={panel.value} value={panel.value} paddingBlock="3">
          <Text textStyle="bodySm" color="fg.alternative">
            {panel.body}
          </Text>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

function FittedTabsDemo() {
  return (
    <Tabs.Root defaultValue="roaming" variant="enclosed" size="sm" fitted width="100%">
      <Tabs.List>
        <Tabs.Trigger value="roaming">돌아다님</Tabs.Trigger>
        <Tabs.Trigger value="in_care">보호 중</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Content value="roaming" paddingBlock="3">
        <Text textStyle="bodySm" color="fg.alternative">
          아직 자리를 옮길 수 있는 상태입니다.
        </Text>
      </Tabs.Content>
      <Tabs.Content value="in_care" paddingBlock="3">
        <Text textStyle="bodySm" color="fg.alternative">
          제보자나 이웃이 데리고 있는 상태입니다.
        </Text>
      </Tabs.Content>
    </Tabs.Root>
  );
}

function ScrollTabsDemo() {
  return (
    <Tabs.Root defaultValue={SCROLL_TABS[0]} variant="line" size="sm" width="100%" minWidth="0">
      <Tabs.List
        overflowX="auto"
        scrollbarWidth="none"
        css={{ "&::-webkit-scrollbar": { display: "none" }, "& > *": { flexShrink: 0 } }}
      >
        {SCROLL_TABS.map((label) => (
          <Tabs.Trigger key={label} value={label}>
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {SCROLL_TABS.map((label) => (
        <Tabs.Content key={label} value={label} paddingBlock="3">
          <Text textStyle="bodySm" color="fg.alternative">
            {label} 조건에 맞는 제보입니다.
          </Text>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

const ANCHOR_CHIPS = ["요약", "사진", "위치", "특징", "보호 상황", "제보자"];

function ScrollNavDemo() {
  const [active, setActive] = useState(ANCHOR_CHIPS[0]);
  return (
    <Box width="100%" paddingInline="screen" paddingBlock="3">
      <ScrollRow>
        {ANCHOR_CHIPS.map((label) => (
          <Chip
            key={label}
            size="small"
            active={active === label}
            onClick={() => setActive(label)}
          >
            {label}
          </Chip>
        ))}
      </ScrollRow>
    </Box>
  );
}

const NEARBY_CARDS = [
  { title: "역삼동", caption: "흰색 소형견, 말티즈 계열 추정" },
  { title: "논현동", caption: "갈색 중형견, 목줄 있음" },
  { title: "삼성동", caption: "삼색 고양이, 사람을 피함" },
];

function CardScrollDemo() {
  return (
    <Box width="100%" paddingInline="screen" paddingBlock="3">
      <ScrollRow>
        {NEARBY_CARDS.map((card) => (
          <Box
            key={card.title}
            width="160px"
            borderWidth="1px"
            borderColor="border.muted"
            borderRadius="card"
            backgroundColor="bg.panel"
            overflow="hidden"
          >
            <Box height="80px" backgroundColor="bg.alternative" />
            <Box padding="3">
              <Text textStyle="label" truncate>
                {card.title}
              </Text>
              <Text textStyle="caption" color="fg.assistive" lineClamp={2}>
                {card.caption}
              </Text>
            </Box>
          </Box>
        ))}
      </ScrollRow>
    </Box>
  );
}

const FORM_STEPS = ["사진", "위치", "특징", "상태"];

function StepsDemo() {
  const [step, setStep] = useState(1);
  return (
    <Steps.Root
      count={FORM_STEPS.length}
      step={step}
      onStepChange={(details) => setStep(details.step)}
      size="sm"
      width="100%"
    >
      <Steps.List>
        {FORM_STEPS.map((title, index) => (
          <Steps.Item key={title} index={index}>
            <Steps.Indicator />
            <Steps.Title textStyle="caption">{title}</Steps.Title>
            <Steps.Separator />
          </Steps.Item>
        ))}
      </Steps.List>
      {FORM_STEPS.map((title, index) => (
        <Steps.Content key={title} index={index} paddingBlock="3">
          <Text textStyle="bodySm" color="fg.alternative">
            {index + 1}단계 {title} 입력 화면입니다.
          </Text>
        </Steps.Content>
      ))}
      <Steps.CompletedContent paddingBlock="3">
        <Text textStyle="bodySm" color="fg.alternative">
          모두 입력했습니다. 마지막으로 확인한 뒤 제보를 올립니다.
        </Text>
      </Steps.CompletedContent>
      <ButtonGroup size="sm" variant="outline" gap="2">
        <Steps.PrevTrigger asChild>
          <Button>이전</Button>
        </Steps.PrevTrigger>
        <Steps.NextTrigger asChild>
          <Button>다음</Button>
        </Steps.NextTrigger>
      </ButtonGroup>
    </Steps.Root>
  );
}

function StepProgressDemo() {
  const [current, setCurrent] = useState(2);
  return (
    <Stack gap="3" width="100%">
      <StepProgress current={current} total={4} label={FORM_STEPS[current - 1]} />
      <ButtonGroup size="sm" variant="outline" gap="2">
        <Button disabled={current === 1} onClick={() => setCurrent((prev) => prev - 1)}>
          이전
        </Button>
        <Button disabled={current === 4} onClick={() => setCurrent((prev) => prev + 1)}>
          다음
        </Button>
      </ButtonGroup>
    </Stack>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(1);
  return (
    <Pagination.Root
      count={48}
      pageSize={8}
      page={page}
      onPageChange={(details) => setPage(details.page)}
      siblingCount={0}
      width="100%"
    >
      <Flex align="center" justify="space-between" gap="2">
        <Pagination.PrevTrigger asChild>
          <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label="이전 쪽">
            <Icon name="back" size={18} />
          </IconButton>
        </Pagination.PrevTrigger>
        <Pagination.PageText format="compact" textStyle="bodySm" color="fg.alternative" />
        <Pagination.NextTrigger asChild>
          <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label="다음 쪽">
            <Icon name="forward" size={18} />
          </IconButton>
        </Pagination.NextTrigger>
      </Flex>
    </Pagination.Root>
  );
}

function NumberedPaginationDemo() {
  const [page, setPage] = useState(2);
  return (
    <Pagination.Root
      count={40}
      pageSize={10}
      page={page}
      onPageChange={(details) => setPage(details.page)}
      siblingCount={1}
      width="100%"
    >
      <Flex align="center" justify="center" gap="1">
        <Pagination.PrevTrigger asChild>
          <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label="이전 쪽">
            <Icon name="back" size={18} />
          </IconButton>
        </Pagination.PrevTrigger>
        <Pagination.Items
          render={(item) => (
            <IconButton
              variant={item.value === page ? "solid" : "ghost"}
              colorPalette={item.value === page ? "brand" : "gray"}
              size="sm"
              aria-label={`${item.value} 쪽`}
            >
              {item.value}
            </IconButton>
          )}
          ellipsis={<Pagination.Ellipsis index={0}>…</Pagination.Ellipsis>}
        />
        <Pagination.NextTrigger asChild>
          <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label="다음 쪽">
            <Icon name="forward" size={18} />
          </IconButton>
        </Pagination.NextTrigger>
      </Flex>
    </Pagination.Root>
  );
}

const FEED_ITEMS = [
  "역삼동 흰색 소형견",
  "논현동 갈색 중형견",
  "삼성동 삼색 고양이",
  "대치동 검은 소형견",
  "청담동 회색 고양이",
  "신사동 갈색 소형견",
];

function LoadMoreDemo() {
  const [shown, setShown] = useState(2);
  const done = shown >= FEED_ITEMS.length;
  return (
    <Stack gap="3" width="100%">
      <ListGroup inset>
        {FEED_ITEMS.slice(0, shown).map((title) => (
          <ListItem key={title} title={title} leading="paw" chevron href="#navigation/pagination" />
        ))}
      </ListGroup>
      {done ? (
        <Text textStyle="caption" color="fg.assistive" textAlign="center">
          마지막 제보까지 모두 보셨습니다
        </Text>
      ) : (
        <Button variant="outline" onClick={() => setShown((prev) => prev + 2)}>
          더 보기
        </Button>
      )}
    </Stack>
  );
}

function CollapsibleTextDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      width="100%"
    >
      <Text textStyle="bodySm" color="fg.alternative">
        흰색 소형견, 말티즈 계열 추정입니다. 목줄은 없고 사람을 따릅니다.
      </Text>
      <Collapsible.Content>
        <Text textStyle="bodySm" color="fg.alternative" paddingTop="2">
          왼쪽 뒷다리를 조금 저는 것처럼 보입니다. 인식표는 확인하지 못했고 품종은 단정하지
          않습니다. 발견 위치는 행정동까지만 공개합니다.
        </Text>
      </Collapsible.Content>
      <Collapsible.Trigger asChild>
        <Button
          variant="plain"
          size="sm"
          paddingInline="0"
          color="fg.alternative"
          marginTop="1"
          gap="1"
        >
          {open ? "접기" : "더 보기"}
          <Box transform={open ? "rotate(180deg)" : undefined} transition="transform 0.2s">
            <Icon name="chevronDown" size={16} />
          </Box>
        </Button>
      </Collapsible.Trigger>
    </Collapsible.Root>
  );
}

function CollapsibleGroupDemo() {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      width="100%"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="card"
      backgroundColor="bg.panel"
      overflow="hidden"
    >
      <Collapsible.Trigger asChild>
        <Flex
          as="button"
          align="center"
          gap="3"
          width="100%"
          minHeight="14"
          paddingInline="4"
          paddingBlock="3"
          textAlign="start"
        >
          <Box flex="1" minWidth="0">
            <Text textStyle="body">알림 세부 설정</Text>
          </Box>
          <Box
            color="fg.assistive"
            transform={open ? "rotate(180deg)" : undefined}
            transition="transform 0.2s"
          >
            <Icon name="chevronDown" size={20} />
          </Box>
        </Flex>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box borderTopWidth="1px" borderColor="border.muted">
          <ListGroup inset>
            <ListItem title="가까운 제보" description="반경 2km" chevron />
            <ListItem title="확인할 후보" description="사진이 겹칠 때" chevron />
            <ListItem title="보호 상황 변경" chevron />
          </ListGroup>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function PageIndicatorDemo({ count }: { count: number }) {
  const [index, setIndex] = useState(0);
  return (
    <Flex align="center" justify="center" gap="4" width="100%">
      <IconButton
        variant="ghost"
        colorPalette="gray"
        size="sm"
        aria-label="이전 장"
        disabled={index === 0}
        onClick={() => setIndex((prev) => prev - 1)}
      >
        <Icon name="back" size={18} />
      </IconButton>
      <PageIndicator count={count} index={index} onSelect={setIndex} />
      <IconButton
        variant="ghost"
        colorPalette="gray"
        size="sm"
        aria-label="다음 장"
        disabled={index === count - 1}
        onClick={() => setIndex((prev) => prev + 1)}
      >
        <Icon name="forward" size={18} />
      </IconButton>
    </Flex>
  );
}

function BreadcrumbDemo({ depth }: { depth: 2 | 3 }) {
  return (
    <Breadcrumb.Root size="sm" width="100%">
      <Breadcrumb.List flexWrap="wrap">
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#navigation/breadcrumb">홈</Breadcrumb.Link>
        </Breadcrumb.Item>
        {depth === 3 ? (
          <>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Link href="#navigation/breadcrumb">공개 제보</Breadcrumb.Link>
            </Breadcrumb.Item>
          </>
        ) : null}
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>역삼동 흰색 소형견</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}

const PALETTE_GROUPS = [
  { title: "최근", icon: "clock" as const, items: ["역삼동 흰색 소형견", "논현동 갈색 중형견"] },
  {
    title: "화면 이동",
    icon: "navigation" as const,
    items: ["발견동물 제보", "공개 제보 목록", "내 정보"],
  },
  { title: "제보", icon: "paw" as const, items: ["삼성동 삼색 고양이", "대치동 검은 소형견"] },
];

function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = PALETTE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.includes(query.trim())),
  })).filter((group) => group.items.length > 0);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="검색"
      maxHeight="70dvh"
      trigger={<Button variant="outline">전체 검색 열기</Button>}
    >
      <Stack gap="4">
        <SearchBar value={query} onChange={setQuery} placeholder="제보나 화면을 찾습니다" />
        {groups.length === 0 ? (
          <Text textStyle="bodySm" color="fg.assistive" textAlign="center" paddingBlock="6">
            결과가 없습니다
          </Text>
        ) : (
          groups.map((group) => (
            <ListGroup key={group.title} title={group.title} inset>
              {group.items.map((item) => (
                <ListItem
                  key={item}
                  title={item}
                  leading={group.icon}
                  chevron
                  onClick={() => setOpen(false)}
                />
              ))}
            </ListGroup>
          ))
        )}
      </Stack>
    </BottomSheet>
  );
}

type RegionNode = { id: string; name: string; children?: RegionNode[] };

const REGION_COLLECTION = createTreeCollection<RegionNode>({
  nodeToValue: (node) => node.id,
  nodeToString: (node) => node.name,
  rootNode: {
    id: "ROOT",
    name: "",
    children: [
      {
        id: "seoul",
        name: "서울특별시",
        children: [
          {
            id: "mapo",
            name: "마포구",
            children: [
              { id: "yeonnam", name: "연남동" },
              { id: "seogyo", name: "서교동" },
            ],
          },
          {
            id: "gangnam",
            name: "강남구",
            children: [
              { id: "yeoksam", name: "역삼동" },
              { id: "nonhyeon", name: "논현동" },
            ],
          },
        ],
      },
    ],
  },
});

function TreeViewDemo() {
  return (
    <TreeView.Root
      collection={REGION_COLLECTION}
      defaultExpandedValue={["seoul", "mapo"]}
      width="100%"
    >
      <TreeView.Label textStyle="label" color="fg.alternative">
        지역 고르기
      </TreeView.Label>
      <TreeView.Tree>
        <TreeView.Node
          indentGuide={<TreeView.BranchIndentGuide />}
          render={({ node, nodeState }) =>
            nodeState.isBranch ? (
              <TreeView.BranchControl>
                <TreeView.BranchIndicator>
                  <Icon name="chevronDown" size={16} />
                </TreeView.BranchIndicator>
                <TreeView.BranchText>{node.name}</TreeView.BranchText>
              </TreeView.BranchControl>
            ) : (
              <TreeView.Item>
                <TreeView.ItemText>{node.name}</TreeView.ItemText>
              </TreeView.Item>
            )
          }
        />
      </TreeView.Tree>
    </TreeView.Root>
  );
}

const LONG_FEED = [
  "역삼동 흰색 소형견",
  "논현동 갈색 중형견",
  "삼성동 삼색 고양이",
  "대치동 검은 소형견",
  "청담동 회색 고양이",
  "신사동 갈색 소형견",
  "연남동 흰색 중형견",
  "서교동 검은 고양이",
  "합정동 갈색 장모종",
  "망원동 흰색 고양이",
];

function BackToTopDemo() {
  const scroller = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  return (
    <Box position="relative" width="100%">
      <Box
        ref={scroller}
        height="320px"
        overflowY="auto"
        paddingInline="screen"
        paddingBlock="4"
        onScroll={(event) => setShown(event.currentTarget.scrollTop > 200)}
      >
        <Stack gap="3">
          {LONG_FEED.map((title) => (
            <Flex
              key={title}
              align="center"
              gap="3"
              padding="3"
              borderWidth="1px"
              borderColor="border.muted"
              borderRadius="card"
              backgroundColor="bg.panel"
            >
              <Circle size="10" backgroundColor="bg.subtle" color="fg.alternative">
                <Icon name="paw" size={20} />
              </Circle>
              <Text textStyle="bodySm" truncate>
                {title}
              </Text>
            </Flex>
          ))}
        </Stack>
      </Box>
      {shown ? (
        <IconButton
          position="absolute"
          bottom="4"
          insetEnd="4"
          borderRadius="full"
          boxShadow="float"
          aria-label="맨 위로"
          onClick={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Icon name="arrowUp" size={20} />
        </IconButton>
      ) : null}
    </Box>
  );
}

export function NavigationCatalog() {
  return (
    <>
      <Spec
        id="app-bar"
        title="App Bar"
        description="뒤로가기, 햄버거, 제목, 오른쪽 동작을 한 줄에 담는 상단 바입니다."
      >
        <Demo variant="screen" label="가운데 제목과 동작 둘">
          <Box width="100%">
            <AppBar
              title="제보 상세"
              back="/"
              sticky={false}
              actions={
                <>
                  <AppBarAction icon="share" label="공유" />
                  <AppBarAction icon="more" label="더 보기" />
                </>
              }
            />
          </Box>
        </Demo>
        <Demo variant="screen" label="왼쪽 정렬과 배지" note="배지는 Float 로 아이콘 위에 겹칩니다.">
          <Box width="100%">
            <AppBar
              title="다시집"
              align="start"
              sticky={false}
              onMenu={() => undefined}
              actions={<BellWithDot />}
            />
          </Box>
        </Demo>
        <Demo variant="screen" label="large 변형">
          <Box width="100%">
            <AppBar
              variant="large"
              title="공개 제보"
              subtitle="가까운 순서로 보여 드립니다"
              sticky={false}
              back={() => undefined}
            />
          </Box>
        </Demo>
        <Demo variant="screen" label="transparent 변형" note="사진 위에 얹을 때 씁니다.">
          <Box width="100%" backgroundColor="brand.muted">
            <AppBar
              variant="transparent"
              sticky={false}
              back={() => undefined}
              actions={<AppBarAction icon="share" label="공유" />}
            />
            <Box height="72px" />
          </Box>
        </Demo>
        <Demo variant="screen" label="닫기 버튼" note="화면 위에 덮는 흐름에서 씁니다.">
          <Box width="100%">
            <AppBar title="사진 고르기" sticky={false} onClose={() => undefined} />
          </Box>
        </Demo>
        <ThemeStage>
          <Box width="100%">
            <AppBar
              title="제보 상세"
              sticky={false}
              back={() => undefined}
              actions={<AppBarAction icon="more" label="더 보기" />}
            />
          </Box>
        </ThemeStage>
        <SpecTable
          rows={[
            ["높이", <><Token>sizes.appBar</Token> 56px</>],
            ["위 여백", <Token key="spacing.safeTop">spacing.safeTop</Token>],
            ["아래 선", <>1px <Token>border.muted</Token></>],
            ["좌우 여백", "8px"],
            ["z-index", <Token key="sticky">sticky</Token>],
          ]}
        />
        <Usage code={'<AppBar title back="/" actions={<AppBarAction icon="share" label="공유" />} />'} />
      </Spec>

      <Spec
        id="tab-bar"
        title="Tab Bar"
        description="화면 아래에 붙는 주 메뉴입니다. 항목은 다섯을 넘기지 않습니다."
      >
        <TabBarDemo />
        <SpecTable
          rows={[
            ["높이", <><Token>sizes.tabBar</Token> 60px</>],
            ["아래 여백", <Token key="spacing.safeBottom">spacing.safeBottom</Token>],
            ["활성 알약", "52 x 28px"],
            ["위 선", <>1px <Token>border.muted</Token></>],
            ["z-index", <Token key="docked">docked</Token>],
          ]}
        />
        <Usage code={'<TabBar items={items} activeHref="/reports" />'} />
      </Spec>

      <Spec
        id="tabs"
        title="Tabs"
        description="한 화면 안에서 목록을 나눕니다. 화면 이동에는 Tab Bar 를 씁니다."
      >
        <Demo label="line">
          <TabsDemo variant="line" />
        </Demo>
        <Demo label="subtle">
          <TabsDemo variant="subtle" />
        </Demo>
        <Demo label="enclosed">
          <TabsDemo variant="enclosed" />
        </Demo>
        <Demo label="fitted" note="둘이나 셋으로 나눌 때 가로를 꽉 채웁니다.">
          <FittedTabsDemo />
        </Demo>
        <Demo label="가로 스크롤" note="여섯 개가 넘으면 목록만 좌우로 넘깁니다.">
          <ScrollTabsDemo />
        </Demo>
        <ThemeStage>
          <Box width="100%">
            <TabsDemo variant="line" />
          </Box>
        </ThemeStage>
        <Usage code={'<Tabs.Root variant="line" size="sm" fitted>'} />
      </Spec>

      <Spec
        id="scroll-nav"
        title="Scroll Nav"
        description="화면 여백 밖까지 넘기는 가로 줄입니다. 이 카탈로그 상단도 같은 구조입니다."
      >
        <Demo variant="screen" label="칩 앵커">
          <ScrollNavDemo />
        </Demo>
        <Demo variant="screen" label="카드 줄" note="카드는 160px 로 고정해 다음 장이 살짝 보이게 둡니다.">
          <CardScrollDemo />
        </Demo>
        <Usage code={"<ScrollRow><Chip size=\"small\" active /></ScrollRow>"} />
      </Spec>

      <Spec
        id="breadcrumb"
        title="Breadcrumb"
        description="깊이가 얕은 화면에서는 상위 한 단계만 뒤로가기로 두는 편이 낫습니다."
      >
        <Demo label="3단계">
          <BreadcrumbDemo depth={3} />
        </Demo>
        <Demo label="2단계" note="모바일 기본은 상단 바의 뒤로가기 하나입니다.">
          <BreadcrumbDemo depth={2} />
        </Demo>
        <Usage code={"<Breadcrumb.CurrentLink>역삼동 흰색 소형견</Breadcrumb.CurrentLink>"} />
      </Spec>

      <Spec
        id="command-palette"
        title="Command Palette"
        description="제보와 화면을 한 곳에서 찾습니다. 입력한 글자로 그룹별 결과를 좁힙니다."
      >
        <Demo label="전체 검색 시트" note="비우면 최근 항목이 그대로 돌아옵니다.">
          <CommandPaletteDemo />
        </Demo>
        <Usage code={"<BottomSheet><SearchBar value onChange /></BottomSheet>"} />
      </Spec>

      <Spec
        id="tree-view"
        title="Tree View"
        description="지역처럼 층이 있는 목록을 폅니다. 관리 화면 기준이고 제보 흐름에서는 쓰지 않습니다."
      >
        <Demo label="지역 계층">
          <TreeViewDemo />
        </Demo>
        <Usage code={"createTreeCollection({ nodeToValue, nodeToString, rootNode })"} />
      </Spec>

      <Spec
        id="steps"
        title="Steps"
        description="단계 폼에는 StepProgress 를 먼저 씁니다. Steps 는 단계 이름을 함께 보여야 할 때만 씁니다."
      >
        <Demo label="가로 4단계">
          <StepsDemo />
        </Demo>
        <Demo label="StepProgress" note="가로가 좁은 화면에서 이름이 잘리지 않는 기본 선택입니다.">
          <StepProgressDemo />
        </Demo>
        <Usage code={"<Steps.Root count={4} step={step} onStepChange={...} size=\"sm\">"} />
      </Spec>

      <Spec
        id="pagination"
        title="Pagination"
        description="모바일 기본은 더 보기 버튼입니다. 쪽 번호는 관리 화면에서만 씁니다."
      >
        <Demo label="더 보기" note="끝에 닿으면 버튼을 지우고 마무리 문구를 남깁니다.">
          <LoadMoreDemo />
        </Demo>
        <Demo label="compact">
          <PaginationDemo />
        </Demo>
        <Demo label="쪽 번호">
          <NumberedPaginationDemo />
        </Demo>
        <Usage code={'<Pagination.PageText format="compact" />'} />
      </Spec>

      <Spec
        id="link"
        title="Link"
        description="본문 안 이동은 Link, 화면을 바꾸는 주 동작은 Button 으로 나눕니다."
      >
        <Demo variant="row" label="변형">
          <Link href="#navigation/link" variant="underline">
            밑줄 링크
          </Link>
          <Link href="#navigation/link" variant="plain">
            민 링크
          </Link>
          <Link
            href="https://www.animal.go.kr"
            target="_blank"
            rel="noreferrer"
            variant="underline"
            gap="1"
          >
            동물보호관리시스템
            <Icon name="externalLink" size={16} />
          </Link>
        </Demo>
        <Demo label="본문 안 링크">
          <Text textStyle="bodySm" color="fg.alternative">
            위치는 행정동까지만 공개합니다. 자세한 기준은{" "}
            <Link href="#navigation/link" variant="underline">
              개인정보 처리방침
            </Link>
            에서 확인합니다.
          </Text>
        </Demo>
        <Demo variant="row" label="링크처럼 보이는 버튼과 NextLink">
          <Button variant="plain" size="sm" paddingInline="0" color="brand.fg">
            비밀번호 재설정
          </Button>
          <Link asChild variant="underline">
            <NextLink href="/reports">공개 제보 목록</NextLink>
          </Link>
        </Demo>
        <Usage code={"<Link asChild variant=\"underline\"><NextLink href=\"/reports\" /></Link>"} />
      </Spec>

      <Spec
        id="collapsible"
        title="Collapsible"
        description="긴 설명과 자주 쓰지 않는 설정을 접어 둡니다."
      >
        <Demo label="더 보기와 접기">
          <CollapsibleTextDemo />
        </Demo>
        <Demo label="설정 묶음">
          <CollapsibleGroupDemo />
        </Demo>
        <Usage code={"<Collapsible.Root open onOpenChange><Collapsible.Content /></Collapsible.Root>"} />
      </Spec>

      <Spec
        id="back-to-top"
        title="Back to Top"
        description="긴 목록에서 200px 넘게 내려가면 나타납니다."
      >
        <Demo variant="screen" label="스크롤 안에서" note="누르면 부드럽게 맨 위로 돌아갑니다.">
          <BackToTopDemo />
        </Demo>
        <Usage code={'scrollTo({ top: 0, behavior: "smooth" })'} />
      </Spec>

      <Spec
        id="page-indicator"
        title="Page Indicator"
        description="캐러셀과 온보딩에서 지금 몇 번째 장인지 알립니다."
      >
        <Demo label="3장">
          <PageIndicatorDemo count={3} />
        </Demo>
        <Demo label="5장" note="점을 눌러 바로 옮길 수 있습니다.">
          <PageIndicatorDemo count={5} />
        </Demo>
        <Usage code={"<PageIndicator count={5} index={index} onSelect={setIndex} />"} />
      </Spec>
    </>
  );
}
