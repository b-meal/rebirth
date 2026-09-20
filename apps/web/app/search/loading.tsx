import { HStack, Icon, VStack } from "@seed-design/react";
import { IconCameraLine, IconChevronLeftLine, IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { Screen } from "@/components/ui/screen";

// 검색 화면이 서버에서 결과와 차트를 받는 동안 먼저 그리는 껍데기
// 머리는 본 화면과 같은 자리에 두어 데이터가 닿아도 화면이 튀지 않고, 몸통은 진행 표시 하나만 둠
// 입력은 여기서 잠가 두어 데이터가 오기 전에 자판이 올라오지 않음

export default function SearchLoading() {
  return (
    <Screen bg="bg.layerBasement">
      <HStack gap="x2" align="center" px="spacingX.globalGutter" py="x3" bg="bg.layerDefault">
        <ActionButton variant="ghost" size="medium" layout="iconOnly" aria-label="뒤로" disabled>
          <Icon svg={<IconChevronLeftLine />} />
        </ActionButton>
        <VStack align="stretch" grow={1} minWidth="0">
          <TextField aria-label="검색어" size="medium" prefixIcon={<IconMagnifyingglassLine />} disabled>
            <TextFieldInput placeholder="동물 특징이나 동네로 검색" aria-label="검색어 입력" />
          </TextField>
        </VStack>
        <ActionButton variant="ghost" size="medium" layout="iconOnly" aria-label="사진으로 찾기" disabled>
          <Icon svg={<IconCameraLine />} />
        </ActionButton>
      </HStack>
      <VStack grow={1} align="center" justify="center" py="x16" role="status" aria-label="검색 화면을 불러오고 있어요">
        <ProgressCircle size="24" tone="neutral" />
      </VStack>
    </Screen>
  );
}
