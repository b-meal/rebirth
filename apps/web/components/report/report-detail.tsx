"use client";

import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";
import { useCallback, useEffect, useState } from "react";
import { Divider, HStack, ImageFrame, Skeleton, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { Callout } from "seed-design/ui/callout";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TagGroupItem, TagGroupRoot } from "seed-design/ui/tag-group";

import { Screen, ScreenBody, Section } from "@/components/ui/screen";

// 제보 상세, 사진은 비공개 버킷이라 서명 URL 로만 노출하고 시각은 절대 시각

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
  const snackbar = useSnackbarAdapter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "expired">("loading");
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSent, setFlagSent] = useState(false);

  // 서명 URL 을 받아옴, 상태 갱신은 응답이 온 뒤에만 해 렌더 연쇄를 만들지 않음
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

  const apply = useCallback((outcome: { state: "ready" | "expired"; url: string | null }) => {
    setPhotoUrl(outcome.url);
    setPhotoState(outcome.state);
  }, []);

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
      snackbar.create({
        onClose: () => {},
        render: () => <Snackbar variant="positive" message="링크를 복사했습니다" />,
      });
    } catch {
      // 클립보드도 막히면 주소창에서 복사하도록 알림
      snackbar.create({
        onClose: () => {},
        render: () => (
          <Snackbar variant="critical" message="링크를 복사하지 못했습니다. 주소창의 주소를 복사해 주십시오" />
        ),
      });
    }
  }, [report.id, report.areaName, shareUrl, snackbar]);

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
    <Screen>
      <ScreenBody gap="x5">
        {photoState === "loading" ? (
          <Skeleton width="full" height="280px" radius="16" />
        ) : photoState === "ready" && photoUrl ? (
          <ImageFrame
            src={photoUrl}
            alt="제보된 동물 사진"
            ratio={4 / 3}
            width="full"
            borderRadius="r3"
          />
        ) : (
          <VStack align="stretch" gap="x2">
            <Callout tone="informative" description="사진 주소가 만료됐습니다" />
            <ActionButton
              variant="neutralOutline"
              size="small"
              onClick={() => {
                setPhotoState("loading");
                void loadPhoto().then(apply);
              }}
            >
              사진 다시 불러오기
            </ActionButton>
          </VStack>
        )}

        <TagGroupRoot>
          <TagGroupItem
            label={CARE_LABEL[report.careSituation]}
            tone={report.careSituation === "in_care" ? "neutral" : "brand"}
          />
          {report.injury === true ? <TagGroupItem label="주의" tone="neutral" /> : null}
        </TagGroupRoot>

        <Section gap="x2">
          <HStack gap="x1_5" align="center" wrap>
            <Text as="h2" textStyle="t7Bold" color="fg.neutral">
              외형
            </Text>
            <TagGroupRoot>
              <TagGroupItem label="AI 초안, 수정 가능" size="t2" tone="neutralSubtle" />
            </TagGroupRoot>
          </HStack>
          <Text textStyle="articleBody" color="fg.neutral" whiteSpace="pre-wrap">
            {report.appearance ?? "외형 설명이 없습니다"}
          </Text>
        </Section>

        <TagGroupRoot>
          {features.map((feature) => (
            <TagGroupItem key={feature} label={feature} tone="neutralSubtle" />
          ))}
        </TagGroupRoot>

        <Divider />

        <VStack align="stretch" gap="x3">
          <VStack align="stretch" gap="x1">
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              목격 지역
            </Text>
            <Text textStyle="t5Regular" color="fg.neutral">
              {report.areaName ?? "위치 미확인"}
            </Text>
          </VStack>
          <VStack align="stretch" gap="x1">
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              목격 시각
            </Text>
            <Text textStyle="t5Regular" color="fg.neutral">
              {formatAbsolute(report.occurredAt)}
            </Text>
          </VStack>
        </VStack>

        <VStack align="stretch" gap="x2" mt="x2">
          <ActionButton variant="brandSolid" size="large" onClick={share}>
            공유하기
          </ActionButton>
          <ActionButton variant="neutralOutline" size="small" onClick={() => setFlagOpen(true)}>
            이 제보 신고하기
          </ActionButton>
        </VStack>

        <BottomSheetRoot open={flagOpen} onOpenChange={(open) => setFlagOpen(open)}>
          <BottomSheetContent title={flagSent ? "신고를 접수했습니다" : "신고 사유"}>
            <BottomSheetBody>
              {flagSent ? (
                <Text textStyle="t5Regular" color="fg.neutral">
                  확인 후 조치합니다. 접수만으로 제보가 바로 숨겨지지는 않습니다
                </Text>
              ) : (
                <VStack align="stretch" gap="x2">
                  {(Object.keys(FLAG_REASON_LABEL) as FlagReason[]).map((reason) => (
                    <ActionButton
                      key={reason}
                      variant="neutralOutline"
                      size="medium"
                      onClick={() => void sendFlag(reason)}
                    >
                      {FLAG_REASON_LABEL[reason]}
                    </ActionButton>
                  ))}
                </VStack>
              )}
            </BottomSheetBody>
            <BottomSheetFooter>
              <ActionButton
                variant="neutralOutline"
                size="large"
                onClick={() => {
                  setFlagOpen(false);
                  setFlagSent(false);
                }}
              >
                닫기
              </ActionButton>
            </BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheetRoot>
      </ScreenBody>
    </Screen>
  );
}
