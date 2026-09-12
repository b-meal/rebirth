"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";

import { COMMUNITY_CATEGORIES } from "@rebirth/core/community";

import { useNeighborhood } from "@/components/location/neighborhood-provider";

// 글쓰기를 누르면 먼저 무엇을 쓸지 고르는 자리
// 여기서 주제를 정하고 가면 작성 화면은 제목과 내용만 물으면 됨

export type ComposeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 제목 아래 한 줄. 동네를 알면 이름을 넣고 모르면 범위만 말함 */
function NeighborhoodLine() {
  const { areaName, loading } = useNeighborhood();

  // 확인하는 동안 범위를 먼저 말해 두면 이름이 들어올 때 줄이 흔들리지 않음
  if (loading || !areaName) return <>이웃들에게 공개되는 글이에요</>;
  return <>{areaName} 근처 이웃들에게 보여져요</>;
}

/** 위치를 거부했을 때만 나오는 한 번 더 기회 */
function RetryLocation() {
  const { blocked, retry } = useNeighborhood();
  if (!blocked) return null;

  return (
    <HStack justify="space-between" align="center" gap="x3" px="x3" py="x2">
      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        위치를 켜면 내 동네를 보여줘요
      </Text>
      <ActionButton variant="neutralWeak" size="xsmall" onClick={retry}>
        위치 켜기
      </ActionButton>
    </HStack>
  );
}

export function ComposeSheet({ open, onOpenChange }: ComposeSheetProps) {
  const router = useRouter();
  // 객체째 구독하면 동네 이름이 들어올 때마다 effect 가 다시 돌아 함수만 꺼냄
  const { ensure } = useNeighborhood();

  // 시트를 열 때 물음. 커뮤니티를 쓰지 않는 사용자에게는 권한 팝업이 뜨지 않음
  useEffect(() => {
    if (open) ensure();
  }, [open, ensure]);

  const start = (categoryId: string) => {
    onOpenChange(false);
    router.push(`/community/new?category=${categoryId}`);
  };

  return (
    <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
      {/* 핸들과 바깥 탭과 Esc 로 닫혀 X 까지 두면 닫는 길이 넷이라 뺌 */}
      <BottomSheetContent
        title="주제 선택"
        description={<NeighborhoodLine />}
        showHandle
        showCloseButton={false}
      >
        <BottomSheetBody>
          {/* 주제는 이름만으로 충분함. 설명을 붙이면 시트가 화면 절반을 먹음 */}
          <VStack align="stretch">
            <RetryLocation />
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
                  onClick={() => start(option.id)}
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
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
