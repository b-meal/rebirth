"use client";

import { useState } from "react";
import {
  ActionBar,
  AspectRatio,
  Box,
  Button,
  Card,
  Checkbox,
  Circle,
  CloseButton,
  Dialog,
  EmptyState,
  Flex,
  Float,
  IconButton,
  Loader,
  LoaderOverlay,
  Menu,
  Popover,
  Portal,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import { ActionSheet } from "@/components/ui/action-sheet";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { AppBar, AppBarAction } from "@/components/ui/app-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icons";
import { ListGroup, ListItem } from "@/components/ui/list-item";
import { MenuDrawer } from "@/components/ui/menu-drawer";
import { PageIndicator } from "@/components/ui/page-indicator";
import { FRAME_OVERLAY } from "@/components/ui/screen";
import { toaster } from "@/components/ui/toaster";

import { Demo, Spec, SpecTable, Token, Usage } from "./spec";

// 화면 위에 겹쳐 뜨는 컴포넌트의 선택 기준과 예시

function CenterDialogDemo() {
  return (
    <Dialog.Root placement="center" motionPreset="scale">
      <Dialog.Trigger asChild>
        <Button variant="outline">안내 다이얼로그</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding="screen">
          <Dialog.Content borderRadius="sheet" backgroundColor="bg.panel" boxShadow="float">
            <Dialog.Header paddingBottom="2">
              <Dialog.Title textStyle="title3">위치는 행정동까지 공개합니다</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body paddingTop="0">
              <Dialog.Description textStyle="bodySm" color="fg.alternative">
                제보에 담긴 정확 좌표는 목록과 공유 카드에 넣지 않습니다. 발견 동물과 제보자를
                지키기 위한 기준입니다.
              </Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer gap="2">
              <Dialog.ActionTrigger asChild>
                <Button variant="subtle" colorPalette="gray">
                  닫기
                </Button>
              </Dialog.ActionTrigger>
              <Button>알겠습니다</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" aria-label="닫기" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function FullDialogDemo() {
  return (
    <Dialog.Root size="full" motionPreset="slide-in-bottom" scrollBehavior="inside">
      <Dialog.Trigger asChild>
        <Button variant="outline">전문 화면 다이얼로그</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content backgroundColor="bg.canvas">
            <Dialog.Header
              display="grid"
              gridTemplateColumns="1fr auto"
              alignItems="center"
              height="appBar"
              paddingInline="2"
              paddingBlock="0"
              borderBottomWidth="1px"
              borderColor="border.muted"
            >
              <Dialog.Title textStyle="heading" paddingInlineStart="3" truncate>
                개인정보 처리방침
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="static">
                <CloseButton size="lg" variant="ghost" colorPalette="gray" aria-label="닫기" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body paddingInline="screen" paddingBlock="block">
              <Stack gap="3">
                <Text textStyle="bodySm" color="fg.alternative">
                  다시집은 발견동물 제보를 받아 보호소와 이웃에게 전달합니다. 제보에 담긴 사진과
                  위치는 이 목적에만 씁니다.
                </Text>
                <Text textStyle="bodySm" color="fg.alternative">
                  정확 좌표는 서버에만 저장하고 공개 화면에는 행정동까지만 보여 줍니다. 제보자
                  연락처는 보호 기관에만 전달합니다.
                </Text>
                <Text textStyle="bodySm" color="fg.alternative">
                  보관 기간이 지난 제보는 사진과 위치를 함께 지웁니다. 삭제 요청은 설정 화면에서
                  바로 접수합니다.
                </Text>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ConfirmAlertDemo() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      title="이 제보를 등록할까요"
      description="등록하면 이웃과 보호소가 바로 볼 수 있습니다."
      confirmLabel="등록"
      onConfirm={() => {
        setOpen(false);
        toaster.create({ title: "제보를 등록했습니다", type: "success" });
      }}
      trigger={<Button variant="outline">확인과 취소</Button>}
    />
  );
}

function DestructiveAlertDemo() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      title="제보를 삭제할까요"
      description="사진과 위치가 함께 지워지고 되돌릴 수 없습니다."
      confirmLabel="삭제"
      destructive
      onConfirm={() => {
        setOpen(false);
        toaster.create({ title: "제보를 삭제했습니다", type: "success" });
      }}
      trigger={
        <Button variant="outline" colorPalette="red">
          되돌릴 수 없는 동작
        </Button>
      }
    />
  );
}

function NoticeAlertDemo() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      title="위치 권한이 꺼져 있습니다"
      description="설정에서 위치 권한을 켜면 발견 위치를 자동으로 채웁니다."
      confirmLabel="알겠습니다"
      cancelLabel={null}
      onConfirm={() => setOpen(false)}
      trigger={<Button variant="outline">확인만 있는 알림</Button>}
    />
  );
}

function LoadingAlertDemo() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) setOpen(next);
      }}
      title="제보를 보호소에 전달할까요"
      description="전달하는 동안 창이 닫히지 않습니다."
      confirmLabel="전달"
      loading={loading}
      onConfirm={() => {
        setLoading(true);
        window.setTimeout(() => {
          setLoading(false);
          setOpen(false);
          toaster.create({ title: "보호소에 전달했습니다", type: "success" });
        }, 1200);
      }}
      trigger={<Button variant="outline">처리 중 상태</Button>}
    />
  );
}

const SHELTER_OPTIONS = [
  { title: "행복한 동물병원", description: "걸어서 8분" },
  { title: "우리동네 보호소", description: "차로 12분" },
  { title: "시립 동물보호센터", description: "차로 25분" },
];

function OptionSheetDemo() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(SHELTER_OPTIONS[0].title);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="어디로 안내할까요"
      description="가까운 곳부터 보여 드립니다."
      trigger={<Button variant="outline">선택지 시트</Button>}
    >
      <ListGroup inset>
        {SHELTER_OPTIONS.map((option) => (
          <ListItem
            key={option.title}
            title={option.title}
            description={option.description}
            leading="pin"
            trailing={
              picked === option.title ? (
                <Box color="brand.fg">
                  <Icon name="check" size={20} />
                </Box>
              ) : undefined
            }
            onClick={() => {
              setPicked(option.title);
              setOpen(false);
            }}
          />
        ))}
      </ListGroup>
    </BottomSheet>
  );
}

function FooterSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="이 사진으로 진행할까요"
      description="AI 초안을 만든 뒤에도 수정할 수 있습니다."
      trigger={<Button variant="outline">아래 버튼이 있는 시트</Button>}
      footer={
        <>
          <Button flex="1" variant="subtle" colorPalette="gray" onClick={() => setOpen(false)}>
            다시 찍기
          </Button>
          <Button flex="1" onClick={() => setOpen(false)}>
            이대로 진행
          </Button>
        </>
      }
    >
      <Box
        height="120px"
        borderRadius="card"
        backgroundColor="bg.alternative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="fg.assistive"
      >
        <Icon name="image" size={28} />
      </Box>
    </BottomSheet>
  );
}

function CloseButtonSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="확인할 후보"
      description="사진과 특징이 겹치는 제보입니다. 같은 개체로 단정하지 않습니다."
      handle={false}
      closeButton
      trigger={<Button variant="outline">닫기 버튼이 있는 시트</Button>}
    >
      <Stack gap="2">
        <Text textStyle="bodySm" color="fg.alternative">
          흰색 소형견, 말티즈 계열 추정
        </Text>
        <Text textStyle="bodySm" color="fg.alternative">
          발견 위치가 300m 안이고 제보 시각이 하루 차이입니다.
        </Text>
      </Stack>
    </BottomSheet>
  );
}

function TallSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="특징 고르기"
      description="해당하는 항목을 모두 골라 주세요."
      maxHeight="60dvh"
      trigger={<Button variant="outline">내용이 긴 시트</Button>}
    >
      <ListGroup inset>
        {[
          "목줄 있음",
          "인식표 있음",
          "다리를 절음",
          "사람을 피함",
          "사람을 따름",
          "털이 엉킴",
          "상처가 보임",
          "많이 말랐음",
          "임신 또는 수유 중으로 보임",
          "새끼와 함께 있음",
        ].map((label) => (
          <ListItem key={label} title={label} chevron onClick={() => setOpen(false)} />
        ))}
      </ListGroup>
    </BottomSheet>
  );
}

function ActionSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <ActionSheet
      open={open}
      onOpenChange={setOpen}
      title="제보 관리"
      description="되돌릴 수 없는 동작은 빨간 글자로 둡니다."
      trigger={<Button variant="outline">동작 시트 열기</Button>}
      actions={[
        {
          label: "공유",
          icon: "share",
          onSelect: () => toaster.create({ title: "공유 창을 열었습니다", type: "info" }),
        },
        {
          label: "링크 복사",
          icon: "link",
          onSelect: () => toaster.create({ title: "링크를 복사했습니다", type: "success" }),
        },
        {
          label: "삭제",
          icon: "trash",
          destructive: true,
          onSelect: () => toaster.create({ title: "제보를 삭제했습니다", type: "success" }),
        },
      ]}
    />
  );
}

function MenuDrawerDemo({ placement }: { placement: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box width="100%">
        <AppBar
          title="다시집"
          align="start"
          sticky={false}
          onMenu={() => setOpen(true)}
          actions={<AppBarAction icon="bell" label="알림" />}
        />
      </Box>
      <MenuDrawer
        open={open}
        onOpenChange={setOpen}
        placement={placement}
        header={
          <Flex align="center" gap="3" minWidth="0">
            <Circle size="10" backgroundColor="brand.muted" color="brand.fg" textStyle="label">
              다
            </Circle>
            <Box minWidth="0">
              <Text textStyle="bodyStrong" truncate>
                다시집 이웃
              </Text>
              <Text textStyle="caption" color="fg.assistive" truncate>
                제보 3건, 확인할 후보 1건
              </Text>
            </Box>
          </Flex>
        }
        groups={[
          {
            title: "제보",
            items: [
              { label: "발견동물 제보", icon: "camera", active: true, onSelect: () => undefined },
              { label: "내 제보", icon: "list", onSelect: () => undefined },
              { label: "확인할 후보", icon: "paw", trailing: "1", onSelect: () => undefined },
            ],
          },
          {
            title: "설정",
            items: [
              { label: "알림", icon: "bell", onSelect: () => undefined },
              { label: "개인정보 처리방침", icon: "lock", onSelect: () => undefined },
            ],
          },
        ]}
        footer={
          <Text textStyle="caption" color="fg.assistive">
            버전 0.1.0
          </Text>
        }
      />
    </>
  );
}

function DropdownMenuDemo() {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton variant="ghost" colorPalette="gray" size="lg" aria-label="더 보기">
          <Icon name="more" size={22} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minWidth="180px" borderRadius="control" boxShadow="float">
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>제보</Menu.ItemGroupLabel>
              <Menu.Item
                value="share"
                onSelect={() => toaster.create({ title: "공유 창을 열었습니다", type: "info" })}
              >
                <Icon name="share" size={18} />
                <Menu.ItemText>공유</Menu.ItemText>
              </Menu.Item>
              <Menu.Item
                value="copy"
                onSelect={() => toaster.create({ title: "링크를 복사했습니다", type: "success" })}
              >
                <Icon name="link" size={18} />
                <Menu.ItemText>링크 복사</Menu.ItemText>
              </Menu.Item>
            </Menu.ItemGroup>
            <Menu.Separator />
            <Menu.Item
              value="report"
              color="fg.error"
              onSelect={() => toaster.create({ title: "신고를 접수했습니다", type: "success" })}
            >
              <Icon name="flag" size={18} />
              <Menu.ItemText>신고</Menu.ItemText>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function PopoverDemo() {
  return (
    <Flex align="center" gap="1">
      <Text textStyle="label">발견 위치</Text>
      <Popover.Root positioning={{ placement: "top" }}>
        <Popover.Trigger asChild>
          <IconButton variant="ghost" colorPalette="gray" size="xs" aria-label="위치 공개 범위">
            <Icon name="help" size={18} />
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content maxWidth="240px" borderRadius="control" boxShadow="float">
              <Popover.Arrow>
                <Popover.ArrowTip />
              </Popover.Arrow>
              <Popover.Body display="flex" flexDirection="column" gap="1">
                <Popover.Title textStyle="label">위치 공개 범위</Popover.Title>
                <Text textStyle="bodySm" color="fg.alternative">
                  정확 좌표는 공개되지 않습니다. 목록과 공유 카드에는 행정동까지만 나옵니다.
                </Text>
              </Popover.Body>
              <Popover.CloseTrigger asChild>
                <CloseButton size="xs" aria-label="닫기" />
              </Popover.CloseTrigger>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </Flex>
  );
}

function TooltipDemo() {
  return (
    <Tooltip.Root openDelay={200} closeDelay={100}>
      <Tooltip.Trigger asChild>
        <Button variant="outline">확인할 후보</Button>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content maxWidth="220px">
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
            사진과 특징이 겹치는 제보입니다
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function ToastDemo() {
  return (
    <>
      <Button
        variant="outline"
        onClick={() => toaster.create({ title: "링크를 복사했습니다", type: "success" })}
      >
        성공
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toaster.create({
            title: "사진을 불러오지 못했습니다",
            description: "잠시 뒤 다시 시도해 주세요",
            type: "error",
            closable: true,
          })
        }
      >
        오류
      </Button>
      <Button
        variant="outline"
        onClick={() => toaster.create({ title: "임시 저장했습니다", type: "info" })}
      >
        안내
      </Button>
      <Button
        variant="outline"
        onClick={() => toaster.create({ title: "사진을 올리는 중", type: "loading" })}
      >
        진행
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toaster.promise(new Promise<void>((resolve) => window.setTimeout(resolve, 1500)), {
            loading: { title: "제보를 올리는 중" },
            success: { title: "제보를 올렸습니다" },
            error: { title: "올리지 못했습니다" },
          })
        }
      >
        약속 연결
      </Button>
    </>
  );
}

const SELECTABLE_REPORTS = [
  "역삼동 흰색 소형견",
  "논현동 갈색 중형견",
  "삼성동 삼색 고양이",
];

function ActionBarDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (title: string, next: boolean) =>
    setSelected((prev) => (next ? [...prev, title] : prev.filter((item) => item !== title)));

  return (
    <>
      <Stack gap="2" width="100%">
        {SELECTABLE_REPORTS.map((title) => (
          <Checkbox.Root
            key={title}
            checked={selected.includes(title)}
            onCheckedChange={(details) => toggle(title, details.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label textStyle="body">{title}</Checkbox.Label>
          </Checkbox.Root>
        ))}
      </Stack>

      <ActionBar.Root open={selected.length > 0}>
        <Portal>
          <ActionBar.Positioner>
            <ActionBar.Content boxShadow="float">
              <ActionBar.SelectionTrigger>{selected.length}건 선택</ActionBar.SelectionTrigger>
              <ActionBar.Separator />
              <Button
                size="sm"
                variant="outline"
                onClick={() => toaster.create({ title: "공유 창을 열었습니다", type: "info" })}
              >
                공유
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                onClick={() => {
                  setSelected([]);
                  toaster.create({ title: "선택한 제보를 삭제했습니다", type: "success" });
                }}
              >
                삭제
              </Button>
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Portal>
      </ActionBar.Root>
    </>
  );
}

function LoaderOverlayDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Box position="relative" width="100%">
        <Card.Root variant="outline" borderRadius="card" backgroundColor="bg.panel">
          <Card.Body gap="1" padding="4">
            <Text textStyle="bodyStrong">확인할 후보 3건</Text>
            <Text textStyle="bodySm" color="fg.alternative">
              사진과 특징이 겹치는 제보를 모았습니다. 같은 개체로 단정하지 않습니다.
            </Text>
          </Card.Body>
        </Card.Root>
        {loading ? (
          <LoaderOverlay
            borderRadius="card"
            backgroundColor="bg.panel"
            opacity="0.92"
            color="fg.alternative"
          >
            <Loader text="후보를 다시 찾는 중" spinner={<Spinner size="sm" />} />
          </LoaderOverlay>
        ) : null}
      </Box>
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          window.setTimeout(() => setLoading(false), 1400);
        }}
      >
        다시 찾기
      </Button>
    </>
  );
}

function ConfirmPopoverDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: "top-end" }}
    >
      <Popover.Trigger asChild>
        <Button variant="outline" colorPalette="red">
          사진 지우기
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxWidth="240px" borderRadius="control" boxShadow="float">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body display="flex" flexDirection="column" gap="3">
              <Text textStyle="bodySm">고른 사진 한 장을 지웁니다</Text>
              <Flex gap="2">
                <Button
                  flex="1"
                  size="sm"
                  variant="subtle"
                  colorPalette="gray"
                  onClick={() => setOpen(false)}
                >
                  취소
                </Button>
                <Button
                  flex="1"
                  size="sm"
                  colorPalette="red"
                  onClick={() => {
                    setOpen(false);
                    toaster.create({ title: "사진을 지웠습니다", type: "success" });
                  }}
                >
                  지우기
                </Button>
              </Flex>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

const NOTIFICATIONS = [
  { id: "n1", title: "확인할 후보가 1건 있습니다", caption: "역삼동 흰색 소형견", read: false },
  { id: "n2", title: "제보를 보호소에 전달했습니다", caption: "논현동 갈색 중형견", read: false },
  { id: "n3", title: "가까운 제보가 올라왔습니다", caption: "삼성동 삼색 고양이", read: true },
];

function NotificationCenterDemo() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(NOTIFICATIONS);
  const unread = items.filter((item) => !item.read).length;

  return (
    <>
      <Box position="relative">
        <IconButton
          variant="ghost"
          colorPalette="gray"
          size="lg"
          aria-label="알림"
          onClick={() => setOpen(true)}
        >
          <Icon name="bell" size={24} />
        </IconButton>
        {unread > 0 ? (
          <Float placement="top-end" offsetX="3" offsetY="3">
            <Circle
              size="4"
              backgroundColor="red.solid"
              color="white"
              textStyle="counter"
            >
              {unread}
            </Circle>
          </Float>
        ) : null}
      </Box>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="알림"
        description={unread > 0 ? `안 읽은 알림 ${unread}건` : "모두 읽었습니다"}
        maxHeight="70dvh"
      >
        <Stack gap="2">
          <Flex justify="flex-end">
            <Button
              variant="plain"
              size="sm"
              paddingInline="0"
              color="brand.fg"
              disabled={unread === 0}
              onClick={() => setItems((prev) => prev.map((row) => ({ ...row, read: true })))}
            >
              모두 읽음
            </Button>
          </Flex>
          <Stack gap="1">
            {items.map((item) => (
              <Flex
                key={item.id}
                as="button"
                align="flex-start"
                gap="3"
                width="100%"
                textAlign="start"
                paddingInline="3"
                paddingBlock="3"
                borderRadius="control"
                backgroundColor={item.read ? "transparent" : "bg.subtle"}
                onClick={() =>
                  setItems((prev) =>
                    prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
                  )
                }
              >
                <Circle
                  size="2"
                  marginTop="2"
                  flexShrink={0}
                  backgroundColor={item.read ? "transparent" : "brand.solid"}
                />
                <Box flex="1" minWidth="0">
                  <Text textStyle={item.read ? "bodySm" : "label"}>{item.title}</Text>
                  <Text textStyle="caption" color="fg.assistive" truncate>
                    {item.caption}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Stack>
      </BottomSheet>
    </>
  );
}

function NotificationEmptyDemo() {
  return (
    <EmptyState.Root size="sm">
      <EmptyState.Content>
        <EmptyState.Indicator>
          <Icon name="bell" size={28} />
        </EmptyState.Indicator>
        <EmptyState.Title>새 알림이 없습니다</EmptyState.Title>
        <EmptyState.Description>가까운 제보가 올라오면 여기에 쌓입니다</EmptyState.Description>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}

const LIGHTBOX_PHOTOS = ["brand.300", "brand.500", "brand.700"];

function LightboxDemo() {
  const [index, setIndex] = useState(0);
  const last = LIGHTBOX_PHOTOS.length - 1;

  return (
    <Dialog.Root size="full" motionPreset="scale">
      <Dialog.Trigger asChild>
        <Button variant="outline">사진 크게 보기</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            display="flex"
            flexDirection="column"
            backgroundColor="black"
            color="white"
          >
            <Flex align="center" gap="1" height="appBar" paddingInline="2" flexShrink={0}>
              <Dialog.CloseTrigger asChild position="static">
                <CloseButton size="lg" variant="ghost" color="white" aria-label="닫기" />
              </Dialog.CloseTrigger>
              <Dialog.Title textStyle="label" color="white">
                사진 {index + 1} / {LIGHTBOX_PHOTOS.length}
              </Dialog.Title>
            </Flex>

            <Flex flex="1" align="center" justify="center" gap="1" paddingInline="2">
              <IconButton
                variant="ghost"
                color="white"
                size="lg"
                aria-label="이전 사진"
                disabled={index === 0}
                onClick={() => setIndex((prev) => prev - 1)}
              >
                <Icon name="back" size={22} />
              </IconButton>
              <AspectRatio ratio={4 / 3} flex="1" minWidth="0">
                <Box backgroundColor={LIGHTBOX_PHOTOS[index]} borderRadius="card" />
              </AspectRatio>
              <IconButton
                variant="ghost"
                color="white"
                size="lg"
                aria-label="다음 사진"
                disabled={index === last}
                onClick={() => setIndex((prev) => prev + 1)}
              >
                <Icon name="forward" size={22} />
              </IconButton>
            </Flex>

            <Flex
              direction="column"
              align="center"
              gap="3"
              paddingTop="4"
              paddingBottom="10"
              flexShrink={0}
            >
              <PageIndicator count={LIGHTBOX_PHOTOS.length} index={index} onSelect={setIndex} />
              <Text textStyle="caption" color="white">
                발견 위치는 행정동까지만 공개합니다
              </Text>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

const TOUR_TARGETS = ["제보하기", "가까운 제보", "확인할 후보"];

const TOUR_STEPS = [
  {
    title: "여기서 제보를 시작합니다",
    body: "사진 한 장이면 충분합니다. 나머지는 AI 초안으로 채우고 언제든 고칠 수 있습니다.",
  },
  {
    title: "가까운 제보를 봅니다",
    body: "행정동 기준으로 가까운 순서로 보여 드립니다.",
  },
  {
    title: "확인할 후보를 모읍니다",
    body: "사진과 특징이 겹치는 제보를 모읍니다. 같은 개체로 단정하지 않습니다.",
  },
];

function TourDemo() {
  const [step, setStep] = useState<number | null>(null);
  const last = step === TOUR_STEPS.length - 1;

  return (
    <>
      <Box
        position="relative"
        width="100%"
        borderWidth="1px"
        borderColor="border.muted"
        borderRadius="card"
        overflow="hidden"
      >
        <Stack gap="3" padding="4" paddingBottom="40">
          {TOUR_TARGETS.map((label, index) => {
            const lit = step === index;
            return (
              <Button
                key={label}
                variant="outline"
                position="relative"
                zIndex={lit ? "2" : undefined}
                backgroundColor={lit ? "bg.panel" : undefined}
                boxShadow={lit ? "float" : undefined}
              >
                {label}
              </Button>
            );
          })}
        </Stack>

        {step !== null ? (
          <>
            <Box position="absolute" inset="0" zIndex="1" backgroundColor="black" opacity="0.55" />
            <Box
              position="absolute"
              zIndex="3"
              insetInline="4"
              bottom="4"
              padding="4"
              borderRadius="card"
              backgroundColor="bg.panel"
              boxShadow="float"
            >
              <Stack gap="2">
                <Text textStyle="heading">{TOUR_STEPS[step].title}</Text>
                <Text textStyle="bodySm" color="fg.alternative">
                  {TOUR_STEPS[step].body}
                </Text>
                <Flex align="center" justify="space-between" gap="2" paddingTop="1">
                  <Text textStyle="caption" color="fg.assistive">
                    {step + 1} / {TOUR_STEPS.length}
                  </Text>
                  <Flex gap="1">
                    <Button
                      size="sm"
                      variant="plain"
                      colorPalette="gray"
                      onClick={() => setStep(null)}
                    >
                      건너뛰기
                    </Button>
                    <Button size="sm" onClick={() => setStep(last ? null : step + 1)}>
                      {last ? "끝내기" : "다음"}
                    </Button>
                  </Flex>
                </Flex>
              </Stack>
            </Box>
          </>
        ) : null}
      </Box>
      <Button variant="outline" disabled={step !== null} onClick={() => setStep(0)}>
        안내 시작
      </Button>
    </>
  );
}

export function OverlaysCatalog() {
  return (
    <>
      <Spec
        id="dialog"
        title="Dialog"
        description="결정은 AlertDialog, 긴 내용은 full 다이얼로그, 선택지는 BottomSheet 로 나눕니다."
      >
        <Demo
          label="가운데 다이얼로그"
          note="FRAME_OVERLAY 를 Content 에 펼쳐 데스크톱에서도 폰 폭 안에서만 뜹니다."
        >
          <CenterDialogDemo />
        </Demo>
        <Demo label="전체 화면 다이얼로그" note="머리는 상단 바처럼 제목과 닫기만 둡니다.">
          <FullDialogDemo />
        </Demo>
        <Usage code={'<Dialog.Positioner padding="screen">'} />
      </Spec>

      <Spec
        id="alert-dialog"
        title="Alert Dialog"
        description="되돌리기 어려운 결정을 묻습니다. 선택지는 최대 둘까지 둡니다."
      >
        <Demo variant="row" label="종류">
          <ConfirmAlertDemo />
          <DestructiveAlertDemo />
          <NoticeAlertDemo />
          <LoadingAlertDemo />
        </Demo>
        <SpecTable
          rows={[
            ["최대 너비", "320px"],
            ["모서리", <><Token>radii.sheet</Token> 24px</>],
            ["그림자", <Token key="shadows.float">shadows.float</Token>],
            ["좌우 여백", <><Token>spacing.screen</Token> 20px</>],
            ["선택지", "최대 2개"],
          ]}
        />
        <Usage code={'<AlertDialog open onOpenChange title description destructive loading />'} />
      </Spec>

      <Spec
        id="bottom-sheet"
        title="Bottom Sheet"
        description="선택지와 짧은 폼을 화면을 떠나지 않고 처리합니다."
      >
        <Demo variant="row" label="구성">
          <OptionSheetDemo />
          <FooterSheetDemo />
          <CloseButtonSheetDemo />
          <TallSheetDemo />
        </Demo>
        <SpecTable
          rows={[
            ["최대 높이", "85dvh"],
            ["상단 모서리", <><Token>radii.sheet</Token> 24px</>],
            ["손잡이", "36 x 4px"],
            ["아래 여백", <Token key="spacing.safeBottom">spacing.safeBottom</Token>],
            ["그림자", <Token key="shadows.overlay">shadows.overlay</Token>],
          ]}
        />
        <Usage code={'<BottomSheet title description footer closeButton maxHeight="60dvh" />'} />
      </Spec>

      <Spec
        id="action-sheet"
        title="Action Sheet"
        description="동작 목록만 담은 시트입니다. 결과는 토스트로 알립니다."
      >
        <Demo label="동작 셋과 삭제">
          <ActionSheetDemo />
        </Demo>
        <Usage code={'<ActionSheet actions={[{ label, icon, destructive, onSelect }]} />'} />
      </Spec>

      <Spec
        id="menu-drawer"
        title="Menu Drawer"
        description="상단 바의 햄버거로 여는 옆 메뉴입니다. 항목은 ListItem 행으로 통일합니다."
      >
        <Demo variant="screen" label="왼쪽에서 열기" note="상단 바의 햄버거를 눌러 확인합니다.">
          <MenuDrawerDemo placement="start" />
        </Demo>
        <Demo variant="screen" label="오른쪽에서 열기">
          <MenuDrawerDemo placement="end" />
        </Demo>
        <Usage code={'<MenuDrawer header groups footer placement="end" />'} />
      </Spec>

      <Spec
        id="menu"
        title="Dropdown Menu"
        description="누른 자리 옆에 뜨는 짧은 목록입니다. 항목이 넷을 넘으면 Action Sheet 를 씁니다."
      >
        <Demo label="더 보기 메뉴">
          <DropdownMenuDemo />
        </Demo>
        <Usage code={'<Menu.Item value="report" color="fg.error" onSelect={...} />'} />
      </Spec>

      <Spec
        id="popover"
        title="Popover"
        description="라벨 옆에서 기준을 덧붙입니다. 닫기 전까지 화면을 막지 않습니다."
      >
        <Demo label="도움말 팝오버">
          <PopoverDemo />
        </Demo>
        <Usage code={"<Popover.Arrow><Popover.ArrowTip /></Popover.Arrow>"} />
      </Spec>

      <Spec
        id="confirm-popover"
        title="Confirm Popover"
        description="누른 자리에서 바로 되묻습니다. 화면을 막지 않으므로 되돌릴 수 있는 것에만 씁니다."
      >
        <Demo label="가벼운 확인" note="지우면 되돌릴 수 없는 것은 AlertDialog 로 올립니다.">
          <ConfirmPopoverDemo />
        </Demo>
        <Usage code={'<Popover.Root positioning={{ placement: "top-end" }}>'} />
      </Spec>

      <Spec
        id="tooltip"
        title="Tooltip"
        description="터치 기기에서는 길게 눌러야 보이므로 필수 정보를 담지 않습니다."
      >
        <Demo label="보조 설명" note="같은 내용을 Popover 나 본문 캡션으로도 읽을 수 있게 둡니다.">
          <TooltipDemo />
        </Demo>
        <Usage code={"<Tooltip.Root openDelay={200} closeDelay={100}>"} />
      </Spec>

      <Spec
        id="toast"
        title="Toast"
        description="지나가도 되는 결과만 알립니다. 사용자가 고쳐야 하는 오류는 그 자리에 남깁니다."
      >
        <Demo variant="row" label="종류">
          <ToastDemo />
        </Demo>
        <Usage code={'toaster.create({ title, description, type: "success", closable: true })'} />
      </Spec>

      <Spec
        id="notification-center"
        title="Notification Center"
        description="지나간 알림을 모아 둡니다. 안 읽은 것은 왼쪽 점과 옅은 바탕으로 구분합니다."
      >
        <Demo label="알림 목록" note="종을 눌러 열고 항목을 누르면 읽음으로 바뀝니다.">
          <NotificationCenterDemo />
        </Demo>
        <Demo label="비었을 때">
          <NotificationEmptyDemo />
        </Demo>
        <Usage code={'<BottomSheet title="알림" maxHeight="70dvh" />'} />
      </Spec>

      <Spec
        id="action-bar"
        title="Action Bar"
        description="여러 건을 고른 동안 아래에 떠 있는 동작 막대입니다."
      >
        <Demo label="선택 모드" note="한 건이라도 고르면 나타나고 모두 풀면 사라집니다.">
          <ActionBarDemo />
        </Demo>
        <Usage code={"<ActionBar.Positioner>"} />
      </Spec>

      <Spec
        id="lightbox"
        title="Lightbox"
        description="사진을 화면 가득 봅니다. 바탕이 검을 때 글자와 아이콘은 흰색으로 고정합니다."
      >
        <Demo label="사진 확대" note="사진 자리는 AspectRatio 4 대 3 색 상자로 대신했습니다.">
          <LightboxDemo />
        </Demo>
        <Usage code={'<Dialog.Content backgroundColor="black" color="white">'} />
      </Spec>

      <Spec
        id="tour"
        title="Tour"
        description="처음 쓰는 사람에게 요소를 짚어 줍니다. 세 단계를 넘기지 않습니다."
      >
        <Demo label="3단계 안내" note="짚는 요소만 막 위로 올리고 나머지는 어둡게 덮습니다.">
          <TourDemo />
        </Demo>
        <Usage code={"<Box position=\"relative\" zIndex=\"2\" /> 위에 반투명 막"} />
      </Spec>

      <Spec
        id="loader-overlay"
        title="Loader Overlay"
        description="이미 그려진 영역을 다시 불러올 때 그 자리를 덮습니다."
      >
        <Demo label="카드 위 덮개" note="처음 불러올 때는 Skeleton 을 쓰고 갱신할 때만 덮습니다.">
          <LoaderOverlayDemo />
        </Demo>
        <Usage code={"<LoaderOverlay><Loader text spinner={<Spinner />} /></LoaderOverlay>"} />
      </Spec>
    </>
  );
}
