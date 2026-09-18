"use client";

import Link from "next/link";
import type { AnimalType } from "@rebirth/types";
import type { LatLng } from "@rebirth/core/location/geo";
import { useEffect, useState } from "react";
import { Box, Divider, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconChevronRightLine,
  IconPersonFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";

import { CTA } from "@/lib/cta-label";
import { describeAnimal, formatAbsolute } from "@/lib/report-label";
import { Screen, SectionCard, SectionTitle } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { AreaSubscribeButton } from "@/components/report/area-subscribe-button";
import { DetailPhotoHero } from "@/components/report/detail-photo-hero";
import { ReportBadges } from "@/components/report/report-badges";
import { ReportFeatures } from "@/components/report/report-features";
import {
  NEARBY_CARD_WIDTH,
  ReportCard,
  type ReportCardItem,
} from "@/components/report/report-card";
import {
  CommentComposer,
  ReportComments,
  type ReportComment,
} from "@/components/report/report-comments";
import { ReportInterestButton } from "@/components/report/report-interest-button";
import { ReportLocationMap } from "@/components/report/report-location-map";
import { ReportShelters, type ShelterItem } from "@/components/report/report-shelters";
import { ReportFlagSheet } from "@/components/report/report-flag-sheet";
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

export type ReportDetailProps = {
  report: PublicReport;
  shareUrl: string;
  /** 목격 시각을 방금, n시간 전으로 줄인 표기, 서버에서 계산해 넘김 */
  sinceLabel: string;
  /** 격자 스냅 좌표, 좌표가 없는 지역 선택 제보는 null */
  location: { point: LatLng; gridMeters: number } | null;
  comments: ReportComment[];
  /** 댓글의 다음 쪽. 없으면 첫 쪽이 전부임 */
  commentCursor: string | null;
  nearby: ReportCardItem[];
  /** 격자 좌표에서 가까운 순으로 고른 공공데이터 기관, 좌표가 없으면 빈 배열 */
  shelters: ShelterItem[];
  interest: { count: number; mine: boolean };
  /** 이 제보의 동네를 이미 구독했는지. 로그인 전이면 늘 false */
  areaSubscribed: boolean;
};

export function ReportDetail({
  report,
  shareUrl,
  sinceLabel,
  location,
  comments,
  commentCursor,
  nearby,
  shelters,
  interest,
  areaSubscribed,
}: ReportDetailProps) {
  const [flagOpen, setFlagOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // 마이페이지의 최근 본 목록에 남김
  useEffect(() => {
    rememberView(report.id);
  }, [report.id]);

  const { options: shareOptions, cardReady, armCard } = useReportShare({
    reportId: report.id,
    shareUrl,
    areaName: report.areaName,
    kind: "sighting",
    prefetch: false,
  });

  // 시트를 여는 모든 길이 지나는 자리, 카드는 여기서 한 번만 받음
  const openShare = (next: boolean) => {
    if (next) armCard();
    setShareOpen(next);
  };

  /**
   * 구조·보호 요청을 어디에 둘지
   * 다친 동물은 급한 일이라 사진 바로 아래로 올리고
   * 이미 누가 데리고 있는 제보는 구조할 대상이 없어 아예 내지 않음
   * 나머지는 기관 목록 다음 절에 두어 전화와 대신 전달을 한 줄로 이음
   */
  const rescuePlace =
    report.careSituation === "in_care"
      ? "none"
      : report.injury === true
        ? "top"
        : "section";

  // 이 화면에 이미 있는 값으로 접수 폼 세 칸이 채워진 채 열림
  const rescueHref = `/guide/injured?from=${report.id}`;

  return (
    <Screen bg="bg.layerBasement">
      <DetailPhotoHero
        reportId={report.id}
        alt="제보된 동물 사진"
        onShare={() => openShare(true)}
      />

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
              {report.areaName ?? "지역 미확인"}, {sinceLabel} 발견
            </Text>
          </VStack>

          {/* 급한 일을 댓글 아래 고정 띠까지 내려가서 찾게 두지 않음 */}
          {rescuePlace === "top" ? (
            <ActionButton variant="brandSolid" size="large" asChild>
              <Link href={rescueHref}>{CTA.rescue}</Link>
            </ActionButton>
          ) : null}

          <Divider />

          <HStack gap="x2" align="center">
            <Avatar
              size="24"
              alt=""
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
            {report.appearance ?? "외형 설명이 없어요"}
          </Text>
        </SectionCard>

        <ReportFeatures report={report} />

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
            <ReportLocationMap
              point={location.point}
              gridMeters={location.gridMeters}
              destinationName={report.areaName ?? "발견 위치"}
            />
          ) : null}
          {/* 같은 동네 제보를 이어서 보려는 사람이 가장 많이 머무는 자리 */}
          {report.areaName ? (
            <AreaSubscribeButton
              reportId={report.id}
              areaName={report.areaName}
              subscribed={areaSubscribed}
            />
          ) : null}
        </SectionCard>

        <ReportShelters items={shelters} />

        {/* 기관 목록 바로 다음 자리. 직접 전화와 대신 전달이 한 줄로 이어짐
            좌표가 없어 기관 목록이 빠진 제보에서도 남아 구조로 가는 길이 사라지지 않음 */}
        {rescuePlace === "section" ? (
          <SectionCard gap="x2">
            <SectionTitle>직접 연락하기 어렵나요</SectionTitle>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              상황을 적어 주시면 관할 기관에 대신 전달해 드릴게요
            </Text>
            <ActionButton variant="neutralWeak" size="medium" asChild>
              <Link href={rescueHref}>{CTA.rescue}</Link>
            </ActionButton>
          </SectionCard>
        ) : null}

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
          {/* 첫 쪽이 다 찼으면 지금 센 수가 전부가 아니라 + 를 붙임 */}
          <SectionTitle>
            댓글 {comments.length}
            {commentCursor ? "+" : ""}
          </SectionTitle>
          <ReportComments
            reportId={report.id}
            comments={comments}
            nextCursor={commentCursor}
          />
          <CommentComposer reportId={report.id} />
        </SectionCard>

        <SectionCard gap="x2" align="flex-start">
          <Text textStyle="t3Regular" color="fg.neutralSubtle">
            댓글 {comments.length}, 공유 {report.shareCount}
          </Text>
          <ActionButton variant="ghost" size="small" onClick={() => setFlagOpen(true)}>
            이 제보 신고하기
          </ActionButton>
        </SectionCard>
      </VStack>

      {/* 아래 고정 자리는 이 화면의 주 행동 하나만 담음
          단추 둘을 나란히 두면 좁은 기기에서 글자가 잘리고 무엇이 먼저인지도 흐려짐
          구조·보호 요청은 상황에 따라 위 절이나 기관 목록 다음 절이 가지고 있음 */}
      {/* 아래 여백은 유틸이 안전 영역을 더해 잡으므로 위쪽만 줌 */}
      <HStack
        className="rebirth-bottom-bar--tight"
        position="sticky"
        bottom="0"
        gap="x2"
        align="center"
        justify="space-between"
        px="spacingX.globalGutter"
        pt="x3"
        borderTopWidth={1}
        borderColor="stroke.neutralMuted"
        bg="bg.layerFloating"
      >
        <ReportInterestButton
          reportId={report.id}
          count={interest.count}
          mine={interest.mine}
        />
        {/* 내 실종 신고와 이 제보의 유사도를 보여 줌. 견줄 신고가 없으면 그 화면이 말해 줌 */}
        <ActionButton variant="brandSolid" size="medium" asChild>
          <Link href={`/r/${report.id}/match`}>{CTA.match}</Link>
        </ActionButton>
      </HStack>

      <ReportShareSheet
        open={shareOpen}
        onOpenChange={openShare}
        options={shareOptions}
        cardReady={cardReady}
      />

      <ReportFlagSheet reportId={report.id} open={flagOpen} onOpenChange={setFlagOpen} />
    </Screen>
  );
}
