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
import { CTA } from "@/lib/cta-label";
import { requestRescue, type RescueFormState } from "@/app/guide/injured/actions";

// 다친 동물을 본 사람이 쓰는 화면
// 읽을 거리를 두지 않음. 급한 사람은 안내문을 읽지 않고 세 칸만 채우면 끝나야 함

const RESCUE_PHONE = "1577-0954";

/** 제보 상세에서 왔을 때 채워 둘 값. 칸 길이는 서버에서 이미 맞춰 옴 */
export type RescuePrefill = {
  reportId: string;
  where?: string;
  what?: string;
  condition?: string;
};

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="brandSolid" size="large" loading={pending}>
      {CTA.rescueSubmit}
    </ActionButton>
  );
}

/** 접수를 마친 뒤. 다음에 할 일 하나만 남김 */
function Done({ reference, reportId }: { reference: string; reportId?: string }) {
  return (
    <Screen>
      <AppHeader title={CTA.rescue} home />
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
          {/* 제보에서 온 사람에게 또 제보를 시키지 않고 보던 자리로 되돌림 */}
          <ActionButton variant="neutralSolid" size="large" asChild>
            {reportId ? (
              <Link href={`/r/${reportId}`}>제보 다시 보기</Link>
            ) : (
              <Link href="/report">발견 제보 남기기</Link>
            )}
          </ActionButton>
          <ActionButton variant="neutralOutline" size="large" asChild>
            <Link href="/shelters">가까운 보호, 구조 기관 보기</Link>
          </ActionButton>
          {/* 접수는 즉시 처리가 아니라 급하면 전화가 빠름 */}
          <ActionButton variant="ghost" size="large" asChild>
            <a href={`tel:${RESCUE_PHONE}`}>급하면 {RESCUE_PHONE} 전화</a>
          </ActionButton>
        </VStack>
      </ScreenBody>
    </Screen>
  );
}

export function RescueRequest({ prefill }: { prefill?: RescuePrefill | null }) {
  const [state, formAction] = useActionState<RescueFormState, FormData>(
    requestRescue,
    {},
  );

  if (state.reference) {
    return <Done reference={state.reference} reportId={prefill?.reportId} />;
  }

  const errors = state.errors ?? {};

  return (
    <Screen>
      <AppHeader title={CTA.rescue} />
      <ScreenBody gap="x6">
        <VStack align="stretch" gap="x2">
          <Text as="h2" textStyle="t8Bold" color="fg.neutral">
            {prefill ? "제보 내용을 채워 뒀어요" : "다친 동물을 보셨나요"}
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            {prefill
              ? "맞는지 확인하고 보내 주시면 기관에 대신 전달해 드릴게요"
              : "세 가지만 알려 주시면 기관에 대신 전달해 드릴게요"}
          </Text>
        </VStack>

        {/* 물림 사고를 막는 한 줄. 이것만은 폼 위에 둠 */}
        {/* 아래 오류 알림이 critical 이라 같은 붉은 면을 쓰면 둘을 구분하지 못함 */}
        {/* 고장이 아니라 주의라 warning 을 그대로 두고 면 색만 globals 에서 손봄 */}
        {/* 문장 사이에서 줄이 바뀌게 해 "만지지 말고" 가 중간에 잘리지 않음 */}
        <Callout
          tone="warning"
          description={
            <>
              많이 놀란 상태일 수 있어요
              <br />
              만지지 말고 조금 떨어져서 지켜봐 주세요
            </>
          }
        />

        {state.message ? <Callout tone="critical" description={state.message} /> : null}

        <form action={formAction}>
          {/* 어느 제보에서 온 접수인지. 운영자가 중복 건을 가리는 데 씀 */}
          {/* design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음 */}
          {prefill ? <input type="hidden" name="reportId" value={prefill.reportId} /> : null}

          <VStack align="stretch" gap="x5">
            <TextField
              label="어디에 있나요"
              errorMessage={errors.where}
              invalid={Boolean(errors.where)}
            >
              <TextFieldInput
                name="where"
                defaultValue={prefill?.where}
                placeholder="건물 이름이나 눈에 띄는 표지물"
              />
            </TextField>

            <TextField
              label="어떤 동물인가요"
              errorMessage={errors.what}
              invalid={Boolean(errors.what)}
            >
              <TextFieldInput
                name="what"
                defaultValue={prefill?.what}
                placeholder="흰색 소형견"
              />
            </TextField>

            <TextField
              label="어떤 상태인가요"
              description="잘 모르겠다면 비워 두셔도 괜찮아요"
              errorMessage={errors.condition}
              invalid={Boolean(errors.condition)}
            >
              <TextFieldTextarea
                name="condition"
                defaultValue={prefill?.condition}
                placeholder="다리를 절어요. 움직이지 않아요"
              />
            </TextField>

            <SubmitButton />
          </VStack>
        </form>

        {/* 제보 상세에서 온 사람은 그 화면에서 이미 기관 목록을 지나옴
            여기서 또 기관 찾기로 보내면 방금 있던 자리로 되돌리는 길만 늘어남 */}
        <HStack justify="center" gap="x2">
          {prefill ? null : (
            <ActionButton variant="ghost" size="medium" asChild>
              <Link href="/shelters">가까운 기관 찾기</Link>
            </ActionButton>
          )}
          <ActionButton variant="ghost" size="medium" asChild>
            <a href={`tel:${RESCUE_PHONE}`}>직접 전화할게요</a>
          </ActionButton>
        </HStack>
      </ScreenBody>
    </Screen>
  );
}
