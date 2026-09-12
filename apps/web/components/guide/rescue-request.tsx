"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { requestRescue, type RescueFormState } from "@/app/guide/injured/actions";

// 다친 동물을 본 사람이 쓰는 화면
// 읽을 거리를 두지 않음. 급한 사람은 안내문을 읽지 않고 세 칸만 채우면 끝나야 함

const RESCUE_PHONE = "1577-0954";

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="brandSolid" size="large" loading={pending}>
      구조 요청하기
    </ActionButton>
  );
}

/** 접수를 마친 뒤. 다음에 할 일 하나만 남김 */
function Done({ reference }: { reference: string }) {
  return (
    <Screen>
      <AppHeader title="구조 요청" home />
      <ScreenBody gap="x6" justify="center">
        <VStack align="center" gap="x4">
          <Icon svg={<IconCheckmarkCircleFill />} size="x12" color="fg.positive" />
          <VStack align="center" gap="x2">
            <Text textStyle="t8Bold" color="fg.neutral" align="center">
              접수했어요
            </Text>
            <Text textStyle="t4Regular" color="fg.neutralMuted" align="center">
              확인하는 대로 관할 기관에 전달할게요
            </Text>
          </VStack>
          <Text textStyle="t3Regular" color="fg.neutralSubtle" userSelect="text">
            접수번호 {reference}
          </Text>
        </VStack>

        <VStack align="stretch" gap="x2">
          <ActionButton variant="neutralSolid" size="large" asChild>
            <Link href="/report">발견 제보 남기기</Link>
          </ActionButton>
          {/* 접수는 즉시 처리가 아니라 급하면 전화가 빠름 */}
          <ActionButton variant="neutralOutline" size="large" asChild>
            <a href={`tel:${RESCUE_PHONE}`}>급하면 {RESCUE_PHONE} 전화</a>
          </ActionButton>
        </VStack>
      </ScreenBody>
    </Screen>
  );
}

export function RescueRequest() {
  const [state, formAction] = useActionState<RescueFormState, FormData>(
    requestRescue,
    {},
  );

  if (state.reference) return <Done reference={state.reference} />;

  const errors = state.errors ?? {};

  return (
    <Screen>
      <AppHeader title="구조 요청" />
      <ScreenBody gap="x6">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            다친 동물을 보셨나요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            세 가지만 알려 주시면 기관에 대신 전달해 드릴게요
          </Text>
        </VStack>

        {/* 물림 사고를 막는 한 줄. 이것만은 폼 위에 둠 */}
        {/* 아래 오류 알림이 critical 이라 같은 붉은 면을 쓰면 둘을 구분하지 못함 */}
        {/* 늘 떠 있는 안내라 informative 로 두고 아이콘으로 주의를 줌 */}
        <Callout
          tone="informative"
          description="많이 놀란 상태일 수 있어요. 만지지 말고 조금 떨어져서 지켜봐 주세요"
        />

        {state.message ? <Callout tone="critical" description={state.message} /> : null}

        <form action={formAction}>
          <VStack align="stretch" gap="x5">
            <TextField
              label="어디에 있나요"
              errorMessage={errors.where}
              invalid={Boolean(errors.where)}
            >
              <TextFieldInput name="where" placeholder="건물 이름이나 눈에 띄는 표지물" />
            </TextField>

            <TextField
              label="어떤 동물인가요"
              errorMessage={errors.what}
              invalid={Boolean(errors.what)}
            >
              <TextFieldInput name="what" placeholder="흰색 소형견" />
            </TextField>

            <TextField
              label="어떤 상태인가요"
              description="잘 모르겠다면 비워 두셔도 괜찮아요"
              errorMessage={errors.condition}
              invalid={Boolean(errors.condition)}
            >
              <TextFieldTextarea
                name="condition"
                placeholder="다리를 절어요. 움직이지 않아요"
              />
            </TextField>

            <SubmitButton />
          </VStack>
        </form>

        <HStack justify="center">
          <ActionButton variant="ghost" size="medium" asChild>
            <a href={`tel:${RESCUE_PHONE}`}>직접 전화할게요</a>
          </ActionButton>
        </HStack>
      </ScreenBody>
    </Screen>
  );
}
