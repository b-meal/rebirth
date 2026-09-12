"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FLAG_REASON_LABEL, type AnimalType, type FlagReason } from "@rebirth/types";
import type { LatLng } from "@rebirth/core/location/geo";
import { useCallback, useEffect, useState } from "react";
import {
  AspectRatio,
  Box,
  Divider,
  HStack,
  Icon,
  ImageFrame,
  Skeleton,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconAndroidshareLine,
  IconChevronLeftLine,
  IconChevronRightLine,
  IconHouseLine,
  IconPersonFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";

import {
  ANIMAL_LABEL,
  SIZE_LABEL,
  breedLabel,
  describeAnimal,
  triStateLabel,
} from "@/lib/report-label";
import { Screen, SectionCard } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { ReportBadges } from "@/components/report/report-badges";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import {
  CommentComposer,
  ReportComments,
  type ReportComment,
} from "@/components/report/report-comments";
import { ReportInterestButton } from "@/components/report/report-interest-button";
import { ReportLocationMap } from "@/components/report/report-location-map";
import { ReportShareSheet, useReportShare } from "@/components/share/report-share";
import { rememberView } from "@/components/mine/recent-views";

// 제보 상세, 절마다 카드로 끊고 사진은 비공개 버킷이라 서명 URL 로만 노출

type PublicReport = {
  id: string;
  careSituation: "roaming" | "in_care" | "unknown";
  animalType: AnimalType;
  breedGuess: string | null;
  appearance: string | null;
  colors: string[];
  size: string;
  conditionTags: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  areaName: string | null;
  landmarkNote: string | null;
  occurredAt: Date | string;
  shareCount: number;
};

// 가로로 넘겨 보는 카드 폭, 두 장 반이 걸쳐 보여 더 있다는 것이 드러남
const NEARBY_CARD_WIDTH = "136px";

function formatAbsolute(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text as="h2" textStyle="t4Bold" color="fg.neutral">
      {children}
    </Text>
  );
}

/** 라벨과 값을 한 줄에 둔 특징 행, 글 안에 섞지 않고 대조하기 쉽게 나눔 */
function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" align="flex-start" gap="x4">
      <Text textStyle="t4Regular" color="fg.neutralMuted">
        {label}
      </Text>
      <VStack align="flex-end" minWidth="0">
        <Text textStyle="t4Regular" color="fg.neutral">
          {value}
        </Text>
      </VStack>
    </HStack>
  );
}

export type ReportDetailProps = {
  report: PublicReport;
  shareUrl: string;
  /** 목격 시각을 방금·n시간 전으로 줄인 표기, 서버에서 계산해 넘김 */
  sinceLabel: string;
  /** 격자 스냅 좌표, 좌표가 없는 지역 선택 제보는 null */
  location: { point: LatLng; gridMeters: number } | null;
  comments: ReportComment[];
  nearby: ReportCardItem[];
  interest: { count: number; mine: boolean };
};

export function ReportDetail({
  report,
  shareUrl,
  sinceLabel,
  location,
  comments,
  nearby,
  interest,
}: ReportDetailProps) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "expired">("loading");
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagSent, setFlagSent] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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

  // 마이페이지의 최근 본 목록에 남김
  useEffect(() => {
    rememberView(report.id);
  }, [report.id]);

  useEffect(() => {
    let cancelled = false;
    void loadPhoto().then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPhoto, apply]);

  const { options: shareOptions, cardReady } = useReportShare({
    reportId: report.id,
    shareUrl,
    areaName: report.areaName,
  });

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

  const breed = breedLabel(report.breedGuess);
  const size = SIZE_LABEL[report.size];

  return (
    <Screen bg="bg.layerBasement">
      {/* 사진 위에 헤더를 겹쳐 첫 화면이 사진으로 차게 함 */}
      <Box position="relative">
        {photoState === "loading" ? (
          <Skeleton width="full" height="320px" radius="0" />
        ) : photoState === "ready" && photoUrl ? (
          <ImageFrame src={photoUrl} alt="제보된 동물 사진" ratio={4 / 3} width="full" />
        ) : (
          <AspectRatio ratio={4 / 3} bg="bg.neutralWeak">
            <VStack align="center" justify="center" gap="x2" px="spacingX.globalGutter">
              <Text textStyle="t4Regular" color="fg.neutralMuted">
                사진 주소가 만료됐습니다
              </Text>
              <ActionButton
                variant="neutralOutline"
                size="small"
                onClick={() => {
                  setPhotoState("loading");
                  void loadPhoto().then(apply);
                }}
              >
                다시 불러오기
              </ActionButton>
            </VStack>
          </AspectRatio>
        )}

        <HStack
          position="absolute"
          top="0"
          left="0"
          right="0"
          px="spacingX.globalGutter"
          pt="x3"
          justify="space-between"
          align="center"
        >
          <ContextualFloatingButton
            variant="layer"
            layout="iconOnly"
            aria-label="뒤로"
            onClick={() => router.back()}
          >
            <Icon svg={<IconChevronLeftLine />} />
          </ContextualFloatingButton>
          <HStack gap="x2" align="center">
            <ContextualFloatingButton variant="layer" layout="iconOnly" asChild>
              <Link href="/" aria-label="홈으로">
                <Icon svg={<IconHouseLine />} />
              </Link>
            </ContextualFloatingButton>
            <ContextualFloatingButton
              variant="layer"
              layout="iconOnly"
              aria-label="공유하기"
              onClick={() => setShareOpen(true)}
            >
              <Icon svg={<IconAndroidshareLine />} />
            </ContextualFloatingButton>
          </HStack>
        </HStack>
      </Box>

      <VStack align="stretch" gap="x2" pb="x4">
        <SectionCard gap="x3">
          <ReportBadges
            animalType={report.animalType}
            breedGuess={report.breedGuess}
            size={report.size}
            careSituation={report.careSituation}
            injury={report.injury}
          />

          <VStack align="stretch" gap="x1">
            <Text as="h1" textStyle="t8Bold" color="fg.neutral">
              {describeAnimal(report)}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {report.areaName ?? "지역 미확인"} · {sinceLabel} 발견
            </Text>
          </VStack>

          <Divider />

          <HStack gap="x2" align="center">
            <Avatar
              size="24"
              fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
            />
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              익명 제보자가 {formatAbsolute(report.occurredAt)}에 목격
            </Text>
          </HStack>
        </SectionCard>

        <SectionCard gap="x2">
          <HStack gap="x1_5" align="center" wrap>
            <SectionTitle>제보자가 본 모습</SectionTitle>
            <Badge label="AI 초안, 수정 가능" tone="neutral" />
          </HStack>
          <Text textStyle="articleBody" color="fg.neutral" whiteSpace="pre-wrap">
            {report.appearance ?? "외형 설명이 없습니다"}
          </Text>
        </SectionCard>

        <SectionCard gap="x2_5">
          <SectionTitle>특징</SectionTitle>
          <VStack align="stretch" gap="x2">
            <FeatureRow label="종류" value={ANIMAL_LABEL[report.animalType] ?? "확인 어려움"} />
            <FeatureRow label="품종" value={breed ?? "확인 어려움"} />
            <FeatureRow label="크기" value={size || "확인 어려움"} />
            <FeatureRow
              label="털색"
              value={report.colors.length > 0 ? report.colors.join(", ") : "확인 어려움"}
            />
            <FeatureRow label="목줄" value={triStateLabel(report.collar, "있음", "없음")} />
            <FeatureRow
              label="부상"
              value={triStateLabel(report.injury, "있어 보임", "보이지 않음")}
            />
            {report.earTip !== null ? (
              <FeatureRow label="귀 끝" value={triStateLabel(report.earTip, "절단됨", "그대로")} />
            ) : null}
            {report.conditionTags.length > 0 ? (
              <FeatureRow label="상태" value={report.conditionTags.join(", ")} />
            ) : null}
          </VStack>
        </SectionCard>

        <SectionCard gap="x2">
          <SectionTitle>발견 장소</SectionTitle>
          <Text textStyle="t5Bold" color="fg.neutral">
            {report.areaName ?? "위치 미확인"}
          </Text>
          {report.landmarkNote ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {report.landmarkNote}
            </Text>
          ) : null}
          {location ? (
            <ReportLocationMap point={location.point} gridMeters={location.gridMeters} />
          ) : null}
        </SectionCard>

        {nearby.length > 0 ? (
          <SectionCard gap="x3">
            <HStack asChild justify="space-between" align="center" gap="x2">
              <Link href="/reports">
                <SectionTitle>근처의 다른 제보</SectionTitle>
                <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
              </Link>
            </HStack>
            {/* 세로로 쌓지 않고 넘겨 보게 해 아래 댓글까지 거리를 줄임 */}
            <Box className="rebirth-scroll-row" mx="-x4" px="x4">
              <HStack gap="x3" align="flex-start">
                {nearby.map((item) => (
                  <Box key={item.id} width={NEARBY_CARD_WIDTH} flexShrink={0}>
                    <ReportCard item={item} />
                  </Box>
                ))}
              </HStack>
            </Box>
          </SectionCard>
        ) : null}

        <SectionCard gap="x4">
          <SectionTitle>댓글 {comments.length}</SectionTitle>
          <ReportComments comments={comments} />
          <CommentComposer reportId={report.id} />
        </SectionCard>

        <SectionCard gap="x2" align="flex-start">
          <Text textStyle="t3Regular" color="fg.neutralSubtle">
            댓글 {comments.length} · 공유 {report.shareCount}
          </Text>
          <ActionButton variant="ghost" size="small" onClick={() => setFlagOpen(true)}>
            이 제보 신고하기
          </ActionButton>
        </SectionCard>
      </VStack>

      {/* 아래 고정 자리는 다음 행동을 담음, 부상 제보는 구조 요청을 주 버튼으로 올림 */}
      <HStack
        position="sticky"
        bottom="0"
        gap="x2"
        align="center"
        justify="space-between"
        px="spacingX.globalGutter"
        py="x3"
        borderTopWidth={1}
        borderColor="stroke.neutralMuted"
        bg="bg.layerFloating"
      >
        <ReportInterestButton
          reportId={report.id}
          count={interest.count}
          mine={interest.mine}
        />
        <HStack gap="x2" align="center">
          <ActionButton
            variant={report.injury === true ? "brandSolid" : "neutralWeak"}
            size="medium"
            onClick={() => setRescueOpen(true)}
          >
            구조 요청
          </ActionButton>
          <ActionButton
            variant={report.injury === true ? "neutralWeak" : "brandSolid"}
            size="medium"
            asChild
          >
            <Link href="/lost/new">내 가족 같아요</Link>
          </ActionButton>
        </HStack>
      </HStack>

      <ReportShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        options={shareOptions}
        cardReady={cardReady}
      />

      <BottomSheetRoot open={rescueOpen} onOpenChange={(open) => setRescueOpen(open)}>
        <BottomSheetContent title="구조 요청 안내">
          <BottomSheetBody>
            <VStack align="stretch" gap="x3">
              <Text textStyle="t4Regular" color="fg.neutral">
                구조와 보호는 관할 지자체가 맡습니다. 이 앱이 구조를 대신 접수하지는 않습니다
              </Text>
              <VStack align="stretch" gap="x2">
                <FeatureRow label="지자체 콜센터" value="지역번호 + 120" />
                <FeatureRow label="관할 보호센터 확인" value="animal.go.kr" />
                <FeatureRow label="야생동물" value="시도 야생동물구조센터" />
              </VStack>
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                다친 동물을 옮기면 상태가 나빠질 수 있어 먼저 안내를 확인해 주십시오
              </Text>
            </VStack>
          </BottomSheetBody>
          <BottomSheetFooter>
            <ActionButton variant="brandSolid" size="large" asChild>
              <Link href="/guide/injured">응급 대처 가이드 보기</Link>
            </ActionButton>
            <ActionButton
              variant="neutralOutline"
              size="large"
              onClick={() => setRescueOpen(false)}
            >
              닫기
            </ActionButton>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheetRoot>

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
    </Screen>
  );
}
