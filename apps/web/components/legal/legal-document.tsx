import { Divider, Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { Screen, ScreenBody } from "@/components/ui/screen";

// 화면이 문구를 만들지 않고 발행된 원문만 렌더해 허위 고지를 막는 자리

export type LegalDocumentProps = {
  title: string;
  body: string;
  version: string;
  /** 예약 발행 전이면 비어 있을 수 있음 */
  effectiveAt: Date | null;
  changeSummary?: string | null;
};

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "long",
});

export function LegalDocument({
  title,
  body,
  version,
  effectiveAt,
  changeSummary,
}: LegalDocumentProps) {
  // 원문은 문단 단위로만 나눔, 서식을 임의로 해석하지 않음
  const paragraphs = body.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <Screen>
      <ScreenBody gap="x5">
        <VStack align="stretch" gap="x1">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            {title}
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {effectiveAt ? `${version} · ${KST.format(effectiveAt)} 시행` : version}
          </Text>
        </VStack>

        {changeSummary ? <Callout tone="informative" description={changeSummary} /> : null}

        <Divider />

        <VStack align="stretch" gap="x3">
          {paragraphs.map((paragraph, index) => (
            <Text key={index} textStyle="articleBody" color="fg.neutral" whiteSpace="pre-wrap">
              {paragraph}
            </Text>
          ))}
        </VStack>
      </ScreenBody>
    </Screen>
  );
}

/** 아직 발행되지 않은 문서, 임의 문구 대신 상태를 그대로 알림 */
export function LegalNotPublished({ label }: { label: string }) {
  return (
    <Screen>
      <ScreenBody pt="x12" gap="x4">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          {label}는 아직 발행 전입니다
        </Text>
        <Text textStyle="t5Regular" color="fg.neutralMuted">
          운영 주체와 문의 창구가 확정되면 발행합니다. 확정 전에는 내용을 임의로 안내하지
          않습니다
        </Text>
      </ScreenBody>
    </Screen>
  );
}
