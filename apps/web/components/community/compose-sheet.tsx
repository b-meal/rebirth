"use client";

import { useEffect, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconChevronLeftLine, IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import { COMMUNITY_CATEGORIES, type CategoryDescriptor } from "@rebirth/core/community";

import { useNeighborhood } from "@/components/location/neighborhood-provider";
import { PostFormFields } from "./post-form";

// 글쓰기를 누르면 먼저 무엇을 쓸지 고르고, 이어서 같은 시트 안에서 씀
// 화면을 옮기지 않아 올린 뒤 뒤로 가면 빈 글쓰기 대신 목록으로 감

export type ComposeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * 글쓰기 단계의 앱바. 화면을 다 쓰는 자리라 제 앱바를 들고 있어야 함
 * AppHeader 는 Next 라우터로 뒤로 가지만 여기는 주소가 아니라 단계를 되돌려야 해 따로 둠
 * 좌우 자리를 같은 폭으로 잡아 제목이 가운데에 놓이는 것은 AppHeader 와 같음
 */
function ComposeHeader({ onBack }: { onBack: () => void }) {
  return (
    <HStack
      as="header"
      align="center"
      justify="space-between"
      gap="x2"
      px="x2"
      py="x1_5"
      // 시트 면과 같은 색이라야 앱바가 따로 얹힌 띠로 보이지 않음
      bg="bg.layerFloating"
    >
      <Box width="x10">
        <ActionButton
          variant="ghost"
          size="medium"
          layout="iconOnly"
          aria-label="뒤로"
          onClick={onBack}
        >
          <Icon svg={<IconChevronLeftLine />} />
        </ActionButton>
      </Box>

      <Text as="h1" textStyle="t5Bold" color="fg.neutral" maxLines={1}>
        글쓰기
      </Text>

      {/* 오른쪽은 비워 두고 폭만 맞춰 제목을 가운데에 둠 */}
      <Box width="x10" />
    </HStack>
  );
}

/** 동네를 확인하는 동안 시트 가운데에 띄움. 남은 공간을 채워 가운데에 섬 */
function SheetLoading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
      <ProgressCircle size="24" tone="neutral" />
    </Box>
  );
}

/** 위치를 거부했을 때만 나오는 한 번 더 기회 */
function RetryLocation({ onRetry }: { onRetry: () => void }) {
  return (
    <HStack justify="space-between" align="center" gap="x3" px="x3" py="x2">
      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        위치를 켜면 내 동네를 보여줘요
      </Text>
      <ActionButton variant="neutralWeak" size="xsmall" onClick={onRetry}>
        위치 켜기
      </ActionButton>
    </HStack>
  );
}

export function ComposeSheet({ open, onOpenChange }: ComposeSheetProps) {
  const { areaName, loading, blocked, ensure, retry } = useNeighborhood();

  // 고른 주제. 정해지면 같은 시트가 글쓰기로 바뀜
  const [picked, setPicked] = useState<CategoryDescriptor | null>(null);

  // 시트를 열 때 물음. 커뮤니티를 쓰지 않는 사용자에게는 권한 팝업이 뜨지 않음
  useEffect(() => {
    if (open) ensure();
  }, [open, ensure]);

  // 닫을 때 주제를 비워 다음에 열면 다시 고르는 자리부터 시작함
  const change = (next: boolean) => {
    if (!next) setPicked(null);
    onOpenChange(next);
  };

  return (
    <BottomSheetRoot open={open} onOpenChange={change}>
      {/* 주제 고르기는 핸들과 바깥 탭과 Esc 로 닫혀 X 까지 두면 닫는 길이 넷이라 뺌
          글쓰기는 화면을 다 써 끌 손잡이도 바깥도 없으므로 X 로만 닫음 */}
      {/* 동네를 확인하는 동안은 설명을 비워 뒤늦게 글자가 붙지 않게 함
          스니펫이 description 유무로 자리를 정해 여기서 넘길지 말지 가림 */}
      <BottomSheetContent
        className={picked ? "rebirth-sheet--full" : undefined}
        // 시트 기본 층은 2 라 AppHeader(10) 밑에 깔려 앱바가 시트 머리말을 덮고 탭까지 가로챔
        // 열린 동안은 화면 맨 앞이어야 하므로 앱바 위로 올림
        layerIndex={20}
        // 글쓰기는 제 앱바를 들고 있어 시트 머리말을 쓰지 않음. 이름은 읽는 기계에만 남김
        title={picked ? undefined : "주제 선택"}
        aria-label={picked ? "글쓰기" : undefined}
        description={
          picked || !areaName
            ? undefined
            : `${areaName} 이웃들에게 공개되는 글이에요`
        }
        showHandle={!picked}
        showCloseButton={false}
      >
        {picked ? (
          <>
            {/* 닫지 않고 단계만 되돌려 주제 고르는 시트가 그대로 떠 있음 */}
            <ComposeHeader onBack={() => setPicked(null)} />
            <BottomSheetBody>
              <PostFormFields category={picked} />
            </BottomSheetBody>
          </>
        ) : (
        <BottomSheetBody>
          {/* 주제는 이름만으로 충분함. 설명을 붙이면 시트가 화면 절반을 먹음 */}
          {loading ? <SheetLoading /> : null}
          <VStack align="stretch" display={loading ? "none" : "flex"}>
            {blocked ? <RetryLocation onRetry={retry} /> : null}
            {COMMUNITY_CATEGORIES.map((option) => (
              <HStack
                asChild
                key={option.id}
                justify="space-between"
                align="center"
                gap="x3"
                px="x3"
                py="x3"
              >
                {/* design-system-allow:raw-element 줄 전체를 누르는 자리라 button 이 필요함 */}
                <button
                  type="button"
                  className="rebirth-row"
                  onClick={() => setPicked(option)}
                >
                  <Text textStyle="t4Regular" color="fg.neutral">
                    {option.label}
                  </Text>
                  {/* 기본 x6 은 글자보다 커서 셰브런이 주인공처럼 보임 */}
                  <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
                </button>
              </HStack>
            ))}
          </VStack>
        </BottomSheetBody>
        )}
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
