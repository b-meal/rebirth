"use client";

import { useRouter } from "next/navigation";
import {
  Divider,
  FlexBox,
  SectionMessage,
  TopNavigationButton,
  Typography,
} from "@wanteddev/wds";
import { AppShell } from "../../components/layout/app-shell";
import { LEGAL_SOURCES } from "../../lib/official-contacts";

// WEB-22. 운영 주체와 문의처가 확정되기 전이라 검토용 고지로만 보임
const SECTIONS = [
  {
    title: "처리하는 정보",
    body: "제보 사진, 관찰한 외형과 상태, 목격 지역과 시각을 처리합니다. 위치 권한에 동의하면 목격 좌표를 함께 받습니다.",
  },
  {
    title: "공개되는 범위",
    body: "공개 화면과 공유 카드에는 행정동까지만 보입니다. 정확한 좌표와 개인 관리 주소는 공개하지 않습니다.",
  },
  {
    title: "연락처",
    body: "제보에 전화번호나 이메일을 받지 않습니다. 연락은 앱 안의 익명 경로로만 이어집니다.",
  },
  {
    title: "AI 처리",
    body: "사진에서 외형 초안을 만드는 데 AI를 사용합니다. 초안은 사용자가 고칠 수 있고, 동의하지 않아도 직접 입력해 제보할 수 있습니다.",
  },
  {
    title: "보관과 파기",
    body: "보관 기간과 파기 절차는 승인된 정책 본문에 따라 확정합니다. 확정 전에는 이 문서를 시행 중인 방침으로 볼 수 없습니다.",
  },
  {
    title: "이용자의 권리",
    body: "본인이 남긴 기록의 열람·정정·삭제를 요청할 수 있습니다. 제3자의 권리 침해도 접수할 수 있습니다.",
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <AppShell
      title="개인정보 처리"
      leading={
        <TopNavigationButton variant="text" color="assistive" onClick={() => router.back()}>
          뒤로
        </TopNavigationButton>
      }
    >
      <SectionMessage variant="cautionary" open>
        검토용 고지입니다. 발행 전 확정이 필요해 아직 시행 중인 방침이 아니에요
      </SectionMessage>

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="title3" weight="bold">
          개인정보를 이렇게 처리해요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          사진과 관찰 정보를 필요한 범위에서 처리하며, 정확 위치와 관리 주소는 공개하지
          않습니다. 상세 내용은 승인된 정책 본문에 따라 발행합니다.
        </Typography>
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="20px">
        {SECTIONS.map((section) => (
          <FlexBox key={section.title} flexDirection="column" gap="4px">
            <Typography variant="label1" weight="bold">
              {section.title}
            </Typography>
            <Typography variant="body2" color="semantic.label.alternative">
              {section.body}
            </Typography>
          </FlexBox>
        ))}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="label1" weight="bold">
          아직 확정되지 않은 항목
        </Typography>
        {/* 미정 문의처를 임의로 적지 않음 */}
        <Typography variant="body2" color="semantic.label.alternative">
          운영 주체, 개인정보 보호책임자, 문의 창구, 보관 기간, 처리 위탁과 국외 이전은
          확정 후에 이 문서에 적습니다. 확정 전에는 연락처를 임의로 안내하지 않습니다.
        </Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="6px">
        <Typography variant="caption1" color="semantic.label.assistive">
          관련 법령
        </Typography>
        {LEGAL_SOURCES.map((source) => (
          <Typography key={source.name} variant="caption1">
            <a href={source.href} target="_blank" rel="noreferrer">
              {source.name}
            </a>
          </Typography>
        ))}
      </FlexBox>
    </AppShell>
  );
}
