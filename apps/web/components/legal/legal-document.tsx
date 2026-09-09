import { Flex, Heading, Separator, Text } from "@chakra-ui/react";

import { SectionMessage } from "@/components/ui/section-message";

// 발행본을 그대로 보여줌. 화면이 문구를 만들지 않고 발행된 원문만 렌더함
// 미확정 항목을 화면에서 지어내면 허위 고지가 되므로 본문은 DB 에서만 옴

export type LegalDocumentProps = {
  title: string;
  body: string;
  version: string;
  // 예약 발행 전이면 비어 있을 수 있음
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
  // 원문은 문단 단위로만 나눔. 서식을 임의로 해석하지 않음
  const paragraphs = body.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <Flex direction="column" gap="4" padding="5" paddingBottom="16">
      <Flex direction="column" gap="1">
        <Heading size="xl">{title}</Heading>
        <Text textStyle="sm" color="fg.alternative">
          {effectiveAt ? `${version} · ${KST.format(effectiveAt)} 시행` : version}
        </Text>
      </Flex>

      {changeSummary ? (
        <SectionMessage variant="info">{changeSummary}</SectionMessage>
      ) : null}

      <Separator />

      <Flex direction="column" gap="3">
        {paragraphs.map((paragraph, index) => (
          <Text key={index} whiteSpace="pre-wrap">
            {paragraph}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
}

/** 아직 발행되지 않은 문서. 임의 문구로 대신하지 않고 상태를 그대로 알림 */
export function LegalNotPublished({ label }: { label: string }) {
  return (
    <Flex direction="column" gap="4" padding="5" paddingTop="16">
      <Heading size="xl">{label}는 아직 발행 전입니다</Heading>
      <Text color="fg.alternative">
        운영 주체와 문의 창구가 확정되면 발행합니다. 확정 전에는 내용을 임의로 안내하지
        않습니다
      </Text>
    </Flex>
  );
}
