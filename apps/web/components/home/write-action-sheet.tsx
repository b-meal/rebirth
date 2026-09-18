"use client";

import Link from "next/link";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconCameraLine,
  IconChevronRightLine,
  IconHospitalcrossShieldLine,
  IconMegaphoneLine,
} from "@karrotmarket/react-monochrome-icon";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from "seed-design/ui/bottom-sheet";

// 홈에서 글을 남기는 길을 한 자리에 모은 시트
// 지도 위에 알약을 흩어 두면 같은 곳으로 가는 문이 여럿 생기고 지도도 가려짐
// 떠 있는 단추 하나가 엄지 자리를 지키고 그 안에서 셋이 갈림

type WriteAction = {
  href: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
};

// 잦은 순서. 급할 때 눈이 위에서 아래로 내려가며 고름
const ACTIONS: WriteAction[] = [
  {
    href: "/report",
    title: "제보하기",
    detail: "길에서 만난 동물을 알려요",
    icon: <IconCameraLine />,
  },
  {
    href: "/lost/new",
    title: "우리 아이 찾기",
    detail: "잃어버린 우리 아이를 찾아요",
    icon: <IconMegaphoneLine />,
  },
  {
    href: "/guide/injured",
    title: "다친 동물",
    detail: "다쳤을 때 무엇부터 할지 알려 줘요",
    icon: <IconHospitalcrossShieldLine />,
  },
];

export type WriteActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WriteActionSheet({ open, onOpenChange }: WriteActionSheetProps) {
  return (
    <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title="무엇을 알려 주실래요?">
        <BottomSheetBody>
          <VStack align="stretch" gap="x1">
            {ACTIONS.map((action) => (
              /* 줄 전체가 누르는 자리라 면 색으로 눌리는 곳을 보여 줌 */
              <HStack asChild gap="x3" align="center" py="x3" px="x2" key={action.href}>
                <Link
                  href={action.href}
                  className="rebirth-row"
                  onClick={() => onOpenChange(false)}
                >
                  <Icon svg={action.icon} size="x6" color="fg.brand" />
                  <VStack align="stretch" gap="x0_5" grow={1} minWidth="0">
                    <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
                      {action.title}
                    </Text>
                    <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
                      {action.detail}
                    </Text>
                  </VStack>
                  <Icon svg={<IconChevronRightLine />} size="x5" color="fg.neutralSubtle" />
                </Link>
              </HStack>
            ))}
          </VStack>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
