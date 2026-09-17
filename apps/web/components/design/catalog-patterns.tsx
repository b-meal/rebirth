"use client";

import { useState } from "react";
import { Box, HStack, ScrollFog, Text, VStack } from "@seed-design/react";
import { calloutVariantMap } from "@seed-design/css/recipes/callout";
import { snackbarVariantMap } from "@seed-design/css/recipes/snackbar";
import { IconBellLine, IconTrashcanLine } from "@karrotmarket/react-monochrome-icon";

import { ActionButton } from "seed-design/ui/action-button";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "seed-design/ui/alert-dialog";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
  BottomSheetTrigger,
} from "seed-design/ui/bottom-sheet";
import { ActionableCallout, Callout, DismissibleCallout } from "seed-design/ui/callout";
import { ChipTabsContent, ChipTabsList, ChipTabsRoot, ChipTabsTrigger } from "seed-design/ui/chip-tabs";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTrigger,
} from "seed-design/ui/dialog";
import { HelpBubbleTrigger } from "seed-design/ui/help-bubble";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "seed-design/ui/menu";
import { DismissiblePageBanner, PageBanner } from "seed-design/ui/page-banner";
import { Pagination } from "seed-design/ui/pagination";
import { ResultSection } from "seed-design/ui/result-section";
import {
  SidePanelBody,
  SidePanelContent,
  SidePanelRoot,
  SidePanelTrigger,
} from "seed-design/ui/side-panel";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import {
  SwipeableMenuSheetContent,
  SwipeableMenuSheetGroup,
  SwipeableMenuSheetItem,
  SwipeableMenuSheetRoot,
  SwipeableMenuSheetTrigger,
} from "seed-design/ui/swipeable-menu-sheet";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "seed-design/ui/tabs";

import { CATALOG } from "./registry";
import { Row, Spec, Stage } from "./spec";

// 피드백 오버레이 탐색 절, 열고 닫는 것은 실제로 눌러 보게 둠

const SECTIONS = Object.fromEntries(
  CATALOG.flatMap((group) => group.sections).map((section) => [section.id, section]),
);

const SCROLL_ITEMS = ["배회 중", "한곳에 머묾", "사람을 피함", "사람에게 다가옴", "차도 근처"];

export function CatalogPatterns() {
  const snackbar = useSnackbarAdapter();
  const [page, setPage] = useState(1);

  return (
    <>
      <Spec section={SECTIONS.callout}>
        {calloutVariantMap.tone.map((tone) => (
          <Callout key={tone} tone={tone} title={tone} description="안내 문구가 들어가는 자리" />
        ))}
        <ActionableCallout tone="informative" description="누르면 다음 화면으로 가는 콜아웃" />
        <DismissibleCallout tone="neutral" description="닫을 수 있는 콜아웃" />
      </Spec>

      <Spec section={SECTIONS["page-banner"]}>
        <PageBanner description="화면 맨 위에 붙는 알림" />
        <DismissiblePageBanner
          prefixIcon={<IconBellLine />}
          description="닫을 수 있는 페이지 배너"
        />
      </Spec>

      <Spec section={SECTIONS.snackbar}>
        <Row>
          {snackbarVariantMap.variant.map((variant) => (
            <ActionButton
              key={variant}
              variant="neutralOutline"
              size="small"
              onClick={() =>
                snackbar.create({
                  onClose: () => {},
                  render: () => <Snackbar variant={variant} message={`${variant} 스낵바`} />,
                })
              }
            >
              {variant}
            </ActionButton>
          ))}
        </Row>
      </Spec>

      <Spec section={SECTIONS["result-section"]}>
        <Stage>
          <ResultSection
            size="medium"
            title="조건에 맞는 제보가 없습니다"
            description="조건을 줄이면 더 많은 제보를 볼 수 있습니다"
            primaryActionProps={{ children: "전체 보기" }}
            secondaryActionProps={{ children: "조건 다시 고르기" }}
          />
        </Stage>
      </Spec>

      <Spec section={SECTIONS["help-bubble"]}>
        <Row>
          <HelpBubbleTrigger
            title="유사도 점수"
            description="거리와 시간과 외형을 합친 값이며 동일 개체 확정이 아닙니다"
          >
            <ActionButton variant="neutralOutline" size="small">
              도움말 열기
            </ActionButton>
          </HelpBubbleTrigger>
        </Row>
      </Spec>

      <Spec section={SECTIONS.dialog}>
        <Row>
          <DialogRoot>
            <DialogTrigger asChild>
              <ActionButton variant="neutralOutline" size="small">
                다이얼로그 열기
              </ActionButton>
            </DialogTrigger>
            <DialogContent title="제보 안내" description="화면을 덮는 안내 자리">
              <DialogBody>
                <Text textStyle="t4Regular" color="fg.neutral">
                  본문이 들어가는 자리입니다
                </Text>
              </DialogBody>
              <DialogFooter>
                <ActionButton variant="brandSolid" size="large">
                  확인
                </ActionButton>
              </DialogFooter>
            </DialogContent>
          </DialogRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS["alert-dialog"]}>
        <Row>
          <AlertDialogRoot>
            <AlertDialogTrigger asChild>
              <ActionButton variant="criticalSolid" size="small">
                삭제하기
              </ActionButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>제보를 삭제할까요</AlertDialogTitle>
              <AlertDialogDescription>되돌릴 수 없습니다</AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogAction variant="neutralWeak">취소</AlertDialogAction>
                <AlertDialogAction variant="criticalSolid">삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS["bottom-sheet"]}>
        <Row>
          <BottomSheetRoot>
            <BottomSheetTrigger asChild>
              <ActionButton variant="neutralOutline" size="small">
                바텀시트 열기
              </ActionButton>
            </BottomSheetTrigger>
            <BottomSheetContent title="신고 사유" showHandle>
              <BottomSheetBody>
                <VStack align="stretch" gap="x2">
                  <ActionButton variant="neutralOutline" size="medium">
                    허위 정보
                  </ActionButton>
                  <ActionButton variant="neutralOutline" size="medium">
                    부적절한 사진
                  </ActionButton>
                </VStack>
              </BottomSheetBody>
            </BottomSheetContent>
          </BottomSheetRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS["swipeable-menu-sheet"]}>
        <Row>
          <SwipeableMenuSheetRoot>
            <SwipeableMenuSheetTrigger asChild>
              <ActionButton variant="neutralOutline" size="small">
                메뉴 시트 열기
              </ActionButton>
            </SwipeableMenuSheetTrigger>
            <SwipeableMenuSheetContent title="더 보기">
              <SwipeableMenuSheetGroup>
                <SwipeableMenuSheetItem label="공유하기" />
                <SwipeableMenuSheetItem
                  label="신고하기"
                  prefixIcon={<IconTrashcanLine />}
                />
              </SwipeableMenuSheetGroup>
            </SwipeableMenuSheetContent>
          </SwipeableMenuSheetRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS.menu}>
        <Row>
          <MenuRoot>
            <MenuTrigger asChild>
              <ActionButton variant="neutralOutline" size="small">
                메뉴 열기
              </ActionButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem label="공유하기" />
              <MenuItem label="신고하기" />
            </MenuContent>
          </MenuRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS["side-panel"]}>
        <Row>
          <SidePanelRoot>
            <SidePanelTrigger asChild>
              <ActionButton variant="neutralOutline" size="small">
                사이드 패널 열기
              </ActionButton>
            </SidePanelTrigger>
            <SidePanelContent title="설정">
              <SidePanelBody>
                <Text textStyle="t4Regular" color="fg.neutral">
                  옆에서 밀려 나오는 화면입니다
                </Text>
              </SidePanelBody>
            </SidePanelContent>
          </SidePanelRoot>
        </Row>
      </Spec>

      <Spec section={SECTIONS.tabs}>
        <TabsRoot defaultValue="recent">
          <TabsList>
            <TabsTrigger value="recent">최근</TabsTrigger>
            <TabsTrigger value="near">주변</TabsTrigger>
            <TabsTrigger value="mine" notification>
              내 제보
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recent">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                최근 제보 목록
              </Text>
            </Box>
          </TabsContent>
          <TabsContent value="near">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                주변 제보 목록
              </Text>
            </Box>
          </TabsContent>
          <TabsContent value="mine">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                내 제보 목록
              </Text>
            </Box>
          </TabsContent>
        </TabsRoot>
      </Spec>

      <Spec section={SECTIONS["chip-tabs"]}>
        <ChipTabsRoot defaultValue="all">
          <ChipTabsList>
            <ChipTabsTrigger value="all">전체</ChipTabsTrigger>
            <ChipTabsTrigger value="dog">개</ChipTabsTrigger>
            <ChipTabsTrigger value="cat">고양이</ChipTabsTrigger>
          </ChipTabsList>
          <ChipTabsContent value="all">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                전체 제보
              </Text>
            </Box>
          </ChipTabsContent>
          <ChipTabsContent value="dog">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                개 제보
              </Text>
            </Box>
          </ChipTabsContent>
          <ChipTabsContent value="cat">
            <Box py="x4">
              <Text textStyle="t4Regular" color="fg.neutral">
                고양이 제보
              </Text>
            </Box>
          </ChipTabsContent>
        </ChipTabsRoot>
      </Spec>

      <Spec section={SECTIONS.pagination}>
        <Pagination page={page} totalPages={12} onPageChange={(next) => setPage(next)} />
      </Spec>

      <Spec section={SECTIONS["scroll-fog"]}>
        <ScrollFog placement={["left", "right"]}>
          <HStack gap="spacingX.betweenChips" className="rebirth-scroll-row">
            {SCROLL_ITEMS.map((item) => (
              <Box
                key={item}
                px="x4"
                py="x2"
                borderRadius="full"
                bg="bg.neutralWeak"
                flexShrink={0}
              >
                <Text textStyle="t3Medium" color="fg.neutral">
                  {item}
                </Text>
              </Box>
            ))}
          </HStack>
        </ScrollFog>
      </Spec>
    </>
  );
}
