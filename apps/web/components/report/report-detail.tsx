"use client";

import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Chip,
  Divider,
  FlexBox,
  Modal,
  ModalContainer,
  ModalContent,
  ModalHeading,
  SectionMessage,
  Skeleton,
  Typography,
} from "@wanteddev/wds";

// 제보 상세. 사진은 비공개 버킷에 있어 서명 URL 로만 노출
// 목격 시각은 절대 시각. 상대 시간은 목록에서만 씀

type PublicReport = {
  id: string;
  careSituation: "roaming" | "in_care" | "unknown";
  animalType: "dog" | "cat" | "other" | "unknown";
  appearance: string | null;
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  conditionTags: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  areaName: string | null;
  occurredAt: Date | string;
  shareCount: number;
};

const CARE_LABEL: Record<PublicReport["careSituation"], string> = {
  roaming: "배회 중",
  in_care: "제보자 보호 중",
  unknown: "확인 중",
};

const ANIMAL_LABEL: Record<PublicReport["animalType"], string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "확인 어려움",
};

const SIZE_LABEL: Record<PublicReport["size"], string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "크기 미확인",
};

function formatAbsolute(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type ReportDetailProps = {
  report: PublicReport;
  shareUrl: string;
};

export function ReportDetail({ report, shareUrl }: ReportDetailProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [copied, setCopied] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSent, setFlagSent] = useState(false);

  // 서명 URL 을 받아옴. 상태 갱신은 응답이 온 뒤에만 해 렌더 연쇄를 만들지 않음
  const loadPhoto = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports/${report.id}/photo`);
      if (!response.ok) return { state: "expired" as const, url: null };

      const body = (await response.json()) as { photos?: { url: string }[] };
      const first = body.photos?.[0]?.url;
      if (!first) return { state: "expired" as const, url: null };

      return { state: "ready" as const, url: first };
    } catch {
      return { state: "expired" as const, url: null };
    }
  }, [report.id]);

  const apply = useCallback(
    (outcome: { state: "ready" | "expired"; url: string | null }) => {
      setPhotoUrl(outcome.url);
      setPhotoState(outcome.state);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void loadPhoto().then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPhoto, apply]);

  const share = useCallback(async () => {
    const text = `${report.areaName ?? "위치 미확인"}에서 목격된 발견동물 제보입니다`;
    // 공유 횟수는 지표용이라 실패해도 화면을 막지 않음
    void fetch(`/api/reports/${report.id}/share`, { method: "POST" });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "다시집 제보", text, url: shareUrl });
        return;
      } catch {
        // 사용자가 취소하면 아무것도 하지 않음
        return;
      }
    }
    // 미지원 브라우저는 링크 복사로 대체
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드도 막히면 사용자가 주소창에서 복사
    }
  }, [report.id, report.areaName, shareUrl]);

  const sendFlag = useCallback(
    async (reason: FlagReason) => {
      try {
        await fetch(`/api/reports/${report.id}/flag`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch {
        // 접수 실패도 사용자에게는 같은 안내로 닫음
      }
      setFlagSent(true);
    },
    [report.id],
  );

  const features = [
    ANIMAL_LABEL[report.animalType],
    SIZE_LABEL[report.size],
    ...report.colors,
    ...report.conditionTags,
    report.collar === true ? "목줄 있음" : null,
    report.injury === true ? "부상 있음" : null,
    report.earTip === true ? "귀 끝 절단" : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <FlexBox flexDirection="column" gap="16px" sx={{ padding: "16px 16px 96px" }}>
      {photoState === "loading" ? (
        <Skeleton width="100%" height="280px" />
      ) : photoState === "ready" && photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="제보된 동물 사진"
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            objectFit: "cover",
            borderRadius: "12px",
            display: "block",
          }}
        />
      ) : (
        <FlexBox flexDirection="column" gap="8px">
          <SectionMessage variant="info" open>
            사진 주소가 만료됐습니다
          </SectionMessage>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setPhotoState("loading");
              void loadPhoto().then(apply);
            }}
          >
            사진 다시 불러오기
          </Button>
        </FlexBox>
      )}

      <FlexBox gap="6px" alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          disableInteraction
          variant={report.careSituation === "in_care" ? "outlined" : "solid"}
        >
          {CARE_LABEL[report.careSituation]}
        </Chip>
        {report.injury === true ? (
          <Chip size="small" disableInteraction variant="outlined">
            주의
          </Chip>
        ) : null}
      </FlexBox>

      <FlexBox flexDirection="column" gap="6px">
        <FlexBox gap="6px" alignItems="center" flexWrap="wrap">
          <Typography variant="title3" weight="bold">
            외형
          </Typography>
          <Chip size="xsmall" variant="outlined" disableInteraction>
            AI 초안, 수정 가능
          </Chip>
        </FlexBox>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {report.appearance ?? "외형 설명이 없습니다"}
        </Typography>
      </FlexBox>

      <FlexBox gap="6px" flexWrap="wrap">
        {features.map((feature) => (
          <Chip key={feature} size="small" disableInteraction>
            {feature}
          </Chip>
        ))}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="caption1">목격 지역</Typography>
        <Typography variant="body2">{report.areaName ?? "위치 미확인"}</Typography>
        <Typography variant="caption1" sx={{ marginTop: "8px" }}>
          목격 시각
        </Typography>
        <Typography variant="body2">{formatAbsolute(report.occurredAt)}</Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: "8px" }}>
        <Button fullWidth onClick={share}>
          {copied ? "링크를 복사했습니다" : "공유하기"}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="assistive"
          size="small"
          onClick={() => setFlagOpen(true)}
        >
          이 제보 신고하기
        </Button>
      </FlexBox>

      <Modal open={flagOpen} onOpenChange={setFlagOpen}>
        <ModalContainer variant="bottom">
          <ModalContent>
            <ModalHeading>
              {flagSent ? "신고를 접수했습니다" : "신고 사유"}
            </ModalHeading>
            {flagSent ? (
              <Typography variant="body2">
                확인 후 조치합니다. 접수만으로 제보가 바로 숨겨지지는 않습니다
              </Typography>
            ) : (
              <FlexBox flexDirection="column" gap="8px">
                {(Object.keys(FLAG_REASON_LABEL) as FlagReason[]).map((reason) => (
                  <Button
                    key={reason}
                    variant="outlined"
                    fullWidth
                    onClick={() => void sendFlag(reason)}
                  >
                    {FLAG_REASON_LABEL[reason]}
                  </Button>
                ))}
              </FlexBox>
            )}
            <Button
              variant="outlined"
              color="assistive"
              fullWidth
              onClick={() => {
                setFlagOpen(false);
                setFlagSent(false);
              }}
            >
              닫기
            </Button>
          </ModalContent>
        </ModalContainer>
      </Modal>
    </FlexBox>
  );
}
