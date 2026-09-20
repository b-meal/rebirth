"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactElement, type ReactNode } from "react";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconCameraLine,
  IconChevronRightLine,
  IconHospitalcrossShieldLine,
  IconMegaphoneLine,
} from "@karrotmarket/react-monochrome-icon";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
  BottomSheetTrigger,
} from "seed-design/ui/bottom-sheet";

// 홈에서 글을 남기는 길을 한 자리에 모은 시트
// 지도 위에 알약을 흩어 두면 같은 곳으로 가는 문이 여럿 생기고 지도도 가려짐
// 떠 있는 단추 하나가 엄지 자리를 지키고 그 안에서 셋이 갈림

type WriteAction = {
  href: string;
  title: string;
  detail: string;
  icon: ReactNode;
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

type SheetState = { open: boolean; close: () => void };

const SheetContext = createContext<SheetState>({ open: false, close: () => {} });

/**
 * 열림 상태를 쥐는 자리. 홈 화면 상태로 두면 단추를 누를 때마다 지도와 목록까지 다시 그려짐
 * 여기서 바뀌면 이 컴포넌트와 아래 Trigger 만 다시 그려지고 children 은 같은 요소라 React 가 건너뜀
 */
export function WriteSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <BottomSheetRoot open={open} onOpenChange={setOpen}>
      <SheetContext.Provider value={{ open, close }}>{children}</SheetContext.Provider>
    </BottomSheetRoot>
  );
}

/** 시트를 여는 단추를 감쌈. SEED Trigger 는 onClick 만 붙여 팝업 표시와 열림 상태는 여기서 더함 */
export function WriteSheetTrigger({ children }: { children: ReactElement }) {
  const { open } = useContext(SheetContext);
  return (
    <BottomSheetTrigger asChild aria-haspopup="dialog" aria-expanded={open}>
      {children}
    </BottomSheetTrigger>
  );
}

/** 시트 본문. 줄을 고르면 이동이 끝나기 전에 시트가 먼저 내려감 */
export function WriteActionSheet() {
  const { close } = useContext(SheetContext);
  return (
    <BottomSheetContent title="무엇을 알려 주실래요?">
      <BottomSheetBody>
        <VStack align="stretch" gap="x1">
          {ACTIONS.map((action) => (
            /* 줄 전체가 누르는 자리라 면 색으로 눌리는 곳을 보여 줌 */
            <HStack asChild gap="x3" align="center" py="x3" px="x2" key={action.href}>
              <Link href={action.href} className="rebirth-row" onClick={close}>
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
  );
}
