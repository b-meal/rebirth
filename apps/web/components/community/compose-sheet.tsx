"use client";

import { useEffect, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
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
      {/* 핸들과 바깥 탭과 Esc 로 닫혀 X 까지 두면 닫는 길이 넷이라 뺌 */}
      {/* 동네를 확인하는 동안은 설명을 비워 뒤늦게 글자가 붙지 않게 함
          스니펫이 description 유무로 자리를 정해 여기서 넘길지 말지 가림 */}
      <BottomSheetContent
        title={picked ? "글쓰기" : "주제 선택"}
        description={
          picked || !areaName
            ? undefined
            : `${areaName} 이웃들에게 공개되는 글이에요`
        }
        showHandle
        showCloseButton={false}
      >
        {picked ? (
          <BottomSheetBody>
            {/* 시트라 헤더에 뒤로가기를 둘 자리가 없어 주제 배지가 그 일을 겸함 */}
            <PostFormFields category={picked} onChangeCategory={() => setPicked(null)} />
          </BottomSheetBody>
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
