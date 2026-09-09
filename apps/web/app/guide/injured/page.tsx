"use client";

import { useRouter } from "next/navigation";
import {
  Divider,
  FlexBox,
  SectionMessage,
  TopNavigationButton,
  Typography,
} from "@wanteddev/wds";
import { AppShell } from "../../../components/layout/app-shell";
import {
  CONTACT_SOURCE,
  OFFICIAL_CONTACTS,
  SAFETY_NOTES,
} from "../../../lib/official-contacts";

// WEB-21. 접근·포획·투약 방법은 안내하지 않고 공식 경로만 알림
export default function InjuredGuidePage() {
  const router = useRouter();

  return (
    <AppShell
      title="다친 동물을 발견했다면"
      leading={
        <TopNavigationButton variant="text" color="assistive" onClick={() => router.back()}>
          뒤로
        </TopNavigationButton>
      }
    >
      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="title3" weight="bold">
          안전을 먼저 확인해 주세요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          무리하게 잡거나 치료하려 하지 말고 공식 기관에 도움을 요청해 주세요.
        </Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="10px">
        {SAFETY_NOTES.map((note) => (
          <Typography key={note} variant="body2">
            {note}
          </Typography>
        ))}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="label1" weight="bold">
          공식 신고와 인계 절차를 확인해 주세요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          다시집에 남긴 제보는 공식 신고 접수와 별개예요. 보호와 인계는 공식 기관을 통해
          진행됩니다.
        </Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="12px">
        {OFFICIAL_CONTACTS.map((contact) => (
          <FlexBox
            key={contact.name}
            flexDirection="column"
            gap="4px"
            sx={(theme) => ({
              padding: "12px",
              borderRadius: 12,
              backgroundColor: theme.semantic.background.normal.alternative,
            })}
          >
            <Typography variant="body1" weight="bold">
              {contact.name}
            </Typography>
            <Typography variant="body2" color="semantic.label.alternative">
              {contact.description}
            </Typography>
            {contact.tel && (
              <Typography variant="body1" weight="bold">
                <a href={`tel:${contact.tel.replace(/-/g, "")}`}>{contact.tel}</a>
              </Typography>
            )}
            {contact.href && (
              <Typography variant="body2">
                <a href={contact.href} target="_blank" rel="noreferrer">
                  {contact.href.replace("https://", "")}
                </a>
              </Typography>
            )}
            <Typography variant="caption1" color="semantic.label.assistive">
              {contact.note}
            </Typography>
          </FlexBox>
        ))}
      </FlexBox>

      <SectionMessage variant="info" open>
        전화가 연결되지 않으면 온라인 접수를 이용해 주세요. 통화가 어려운 환경에서도 신고할
        수 있어요
      </SectionMessage>

      <Typography variant="caption1" color="semantic.label.assistive">
        출처 {CONTACT_SOURCE.label} · 최종 확인 {CONTACT_SOURCE.checkedOn}. 기관 사정에
        따라 연락처와 운영 방식이 바뀔 수 있어요
      </Typography>
    </AppShell>
  );
}
