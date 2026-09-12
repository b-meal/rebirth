import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

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
      <AppHeader title={title} />
      <ScreenBody gap="x6">
        {/* 제목은 헤더가 이미 말하고 있어 시행일만 남김 */}
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {effectiveAt ? `${version} · ${KST.format(effectiveAt)} 시행` : version}
        </Text>

        {changeSummary ? <Callout tone="informative" description={changeSummary} /> : null}

        {/* 긴 글이라 문단 사이를 넉넉히 띄워 눈이 쉴 자리를 둠 */}
        <VStack align="stretch" gap="x5">
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
      <AppHeader title={label} />
      <ScreenBody pt="x12" gap="x4">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          아직 준비하고 있어요
        </Text>
        <Text textStyle="t5Regular" color="fg.neutralMuted">
          {/* 문서 이름에 조사를 붙이면 받침에 따라 틀려 이름을 문장 밖에 둠 */}
          운영 주체와 문의 창구가 정해지면 올릴게요. 그 전까지는 정해지지 않은 내용을 임의로
          안내하지 않아요
        </Text>
      </ScreenBody>
    </Screen>
  );
}
