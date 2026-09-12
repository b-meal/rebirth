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
      <BottomSheetContent title="주제 선택" showHandle>
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
                  <Icon svg={<IconChevronRightLine />} color="fg.neutralSubtle" />
                </button>
              </HStack>
            ))}
          </VStack>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
