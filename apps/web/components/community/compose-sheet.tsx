"use client";

import { useRouter } from "next/navigation";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";

import { COMMUNITY_CATEGORIES } from "@rebirth/core/community";

// 글쓰기를 누르면 먼저 무엇을 쓸지 고르는 자리
// 여기서 주제를 정하고 가면 작성 화면은 제목과 내용만 물으면 됨

export type ComposeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ComposeSheet({ open, onOpenChange }: ComposeSheetProps) {
  const router = useRouter();

  const start = (categoryId: string) => {
    onOpenChange(false);
    router.push(`/community/new?category=${categoryId}`);
  };

  return (
    <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
      {/* 핸들과 바깥 탭과 Esc 로 닫혀 X 까지 두면 닫는 길이 넷이라 뺌 */}
      {/* 동네로 거르는 조회가 아직 없어 특정 동을 말하면 사실과 달라짐 */}
      {/* 저장된 내 동네도 없어 글쓰기 폼에서 직접 받는 값이 전부임 */}
      <BottomSheetContent
        title="주제 선택"
        description="이웃들에게 공개되는 글이에요"
        showHandle
        showCloseButton={false}
      >
        <BottomSheetBody>
          {/* 주제는 이름만으로 충분함. 설명을 붙이면 시트가 화면 절반을 먹음 */}
          <VStack align="stretch">
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
