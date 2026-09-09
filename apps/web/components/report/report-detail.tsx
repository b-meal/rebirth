"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Chip,
  Divider,
  FlexBox,
  SectionMessage,
  TopNavigationButton,
  Typography,
} from "@wanteddev/wds";
import { AppShell } from "../layout/app-shell";
import {
  ANIMAL_TYPE_LABEL,
  CARE_SITUATION_LABEL,
  SIZE_LABEL,
  formatSightedAt,
  type PublicReportDetail,
} from "../../lib/report-mock";

// 품종은 단정하지 않고 색과 크기로만 부름
function describeAnimal({ colors, size, animalType }: PublicReportDetail) {
  const color = colors.length > 0 ? colors.join(" ") : "";
  if (animalType === "dog") return `${color} ${SIZE_LABEL[size]}견`.trim();
  if (animalType === "cat") return `${color} 고양이`.trim();
  return `${color} ${ANIMAL_TYPE_LABEL[animalType]}`.trim();
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <FlexBox justifyContent="space-between" gap="16px">
      <Typography variant="body2" color="semantic.label.alternative">
        {label}
      </Typography>
      <Typography variant="body2" align="right">
        {value}
      </Typography>
    </FlexBox>
  );
}

export function ReportDetail({ report }: { report: PublicReportDetail }) {
  const router = useRouter();
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const photo = report.photos[0];

  // 공유 주소는 지금 보고 있는 공개 주소 그대로. 관리 토큰이 섞이지 않음
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        setShareNotice("주소를 복사했어요");
      }
    } catch {
      // 사용자가 공유를 닫은 경우도 여기로 오므로 알리지 않음
    }
  };

  return (
    <AppShell
      title="발견 제보"
      leading={
        <TopNavigationButton variant="text" color="assistive" onClick={() => router.back()}>
          뒤로
        </TopNavigationButton>
      }
      trailing={
        <TopNavigationButton variant="text" onClick={handleShare}>
          공유
        </TopNavigationButton>
      }
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt={photo.alt}
          style={{ width: "100%", borderRadius: 12, display: "block" }}
        />
      )}

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="title3" weight="bold">
          {describeAnimal(report)}을 발견했어요
        </Typography>
        <FlexBox flexWrap="wrap" gap="6px">
          <Chip size="small">{CARE_SITUATION_LABEL[report.careSituation]}</Chip>
          {report.injury === true && <Chip size="small">다친 것으로 보여요</Chip>}
          {report.candidateCount > 0 && (
            <Chip size="small">확인할 후보 {report.candidateCount}</Chip>
          )}
        </FlexBox>
      </FlexBox>

      {report.appearance && (
        <FlexBox flexDirection="column" gap="4px">
          <Typography variant="body1">{report.appearance}</Typography>
          {report.aiDrafted && (
            <Typography variant="caption1" color="semantic.label.assistive">
              AI 초안 · 사용자가 수정할 수 있어요
            </Typography>
          )}
        </FlexBox>
      )}

      <Divider />

      <FlexBox flexDirection="column" gap="10px">
        <Row label="종류" value={ANIMAL_TYPE_LABEL[report.animalType]} />
        {report.colors.length > 0 && (
          <Row label="털색" value={report.colors.join(", ")} />
        )}
        <Row label="크기" value={SIZE_LABEL[report.size]} />
        {report.conditionTags.length > 0 && (
          <Row label="관찰 특징" value={report.conditionTags.join(", ")} />
        )}
        {report.areaName && <Row label="목격 장소" value={report.areaName} />}
        <Row label="목격 시각" value={formatSightedAt(report.occurredAt)} />
      </FlexBox>

      <Typography variant="caption1" color="semantic.label.assistive">
        정확한 위치는 공개하지 않아요. 장소는 행정동까지만 보입니다
      </Typography>

      {report.candidateCount > 0 && (
        <SectionMessage variant="info" open>
          비슷한 실종 신고가 있어 확인할 후보로 두었어요. 같은 동물이라는 뜻은 아닙니다
        </SectionMessage>
      )}

      <Divider />

      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="label1" weight="bold">
          확인한 정보가 있나요?
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          개인 연락처 없이 관련 기록으로 알려 주세요. 연락 기능은 준비 중입니다
        </Typography>
      </FlexBox>

      {shareNotice && (
        <SectionMessage
          variant="positive"
          open
          closeButton
          onOpenChange={(open) => {
            if (!open) setShareNotice(null);
          }}
        >
          {shareNotice}
        </SectionMessage>
      )}
    </AppShell>
  );
}
