"use client";

import Link from "next/link";
import type { AnimalType } from "@rebirth/types";
import type { LatLng } from "@rebirth/core/location/geo";
import { useEffect, useState } from "react";
import { Box, Divider, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconAndroidshareLine,
  IconChevronRightLine,
  IconMagnifyingglassLine,
  IconPersonFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";

import {
  describeAnimal,
  formatAbsolute,
  searchingLabel,
  withObject,
  withSubject,
} from "@/lib/report-label";
import { Screen, SectionCard, SectionTitle } from "@/components/ui/screen";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { AreaSubscribeButton } from "@/components/report/area-subscribe-button";
import { DetailPhotoHero } from "@/components/report/detail-photo-hero";
import { ReportBadges } from "@/components/report/report-badges";
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
import { ReportFeatures } from "@/components/report/report-features";
import { ReportInterestButton } from "@/components/report/report-interest-button";
import { ReportShelters, type ShelterItem } from "@/components/report/report-shelters";
import { ReportFlagSheet } from "@/components/report/report-flag-sheet";
import { ReportShareSheet, useReportShare } from "@/components/share/report-share";
import { rememberView } from "@/components/mine/recent-views";
import { LostOwnerPanel } from "./lost-owner-panel";
import { TrackMap } from "./track-map";
import { TrackSection } from "./track-section";
import { TrackTimeline } from "./track-timeline";
import { useTrack } from "./use-track";

// 실종 신고 상세. 발견 제보와 같은 표에 담기지만 읽는 사람도 다음 행동도 달라 화면을 따로 둠
// 보호자가 적은 기록이라 AI 초안 표시가 없고, 보는 사람이 할 일은 목격 제보임

type PublicLostReport = {
  id: string;
  lifecycle: string;
  version: number;
  /** 닮은 제보 알림을 켜 두었는지. 실종 신고에만 뜻이 있음 */
  matchAlert: boolean;
  /** 미리 적어 둔 내 동물. 이름과 품종은 보호자가 아는 값이라 추정으로 부르지 않음 */
  pet: { name: string; breedGuess: string | null } | null;
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

/**
 * 신고 상태를 한 줄로 알림
 * 며칠째 찾고 있는지가 이 화면에서 가장 먼저 읽혀야 할 값이라 배지로 올림
 * 이름을 아는 신고는 이름으로 부름. 가족을 찾았어요 는 발견자 쪽 말이라 쓰지 않음
 */
function statusBadge(
  lifecycle: string,
  searchingDays: number,
  name: string | null,
): { label: string; tone: BadgeTone } {
  if (lifecycle === "resolved") {
    return { label: name ? `${name}, 집에 왔어요` : "집으로 돌아왔어요", tone: "informative" };
  }
  if (lifecycle === "closed") return { label: "종료된 신고", tone: "neutral" };
  return { label: searchingLabel(searchingDays), tone: "brand" };
}

export type LostDetailProps = {
  report: PublicLostReport;
  shareUrl: string;
  /** 마지막 목격을 방금, n일 전으로 줄인 표기, 서버에서 계산해 넘김 */
  sinceLabel: string;
  /** 며칠째 찾고 있는지, 잃어버린 날이 1일째. 서버에서 계산해 넘겨 렌더마다 흔들리지 않게 함 */
  searchingDays: number;
  /** 격자 스냅 좌표, 좌표가 없는 지역 선택 신고는 null */
  location: { point: LatLng; gridMeters: number } | null;
  comments: ReportComment[];
  /** 댓글의 다음 쪽. 없으면 첫 쪽이 전부임 */
  commentCursor: string | null;
  /** 마지막 목격 지점에서 가까운 발견 제보. 이 화면에서 가장 쓸모 있는 이어보기 */
  nearby: ReportCardItem[];
  shelters: ShelterItem[];
  interest: { count: number; mine: boolean };
  areaSubscribed: boolean;
  /**
   * 내 기록인지와 지금 이 브라우저가 관리할 수 있는지
   * 소유는 로그인 계정이 말하고 권한은 관리 세션에서만 나옴. POL-03
   */
  ownership: { mine: boolean; canManage: boolean };
};

export function LostDetail({
  report,
  shareUrl,
  sinceLabel,
  searchingDays,
  location,
  comments,
  commentCursor,
  nearby,
  shelters,
  interest,
  areaSubscribed,
  ownership,
}: LostDetailProps) {
  const [flagOpen, setFlagOpen] = useState(false);
  // 지도와 설명이 같은 응답을 쓰게 조회를 화면에서 한 번만 함
  const { status: trackStatus, track } = useTrack(report.id);
  const [shareOpen, setShareOpen] = useState(false);

  // 마이페이지의 최근 본 목록에 남김
  useEffect(() => {
    rememberView(report.id);
  }, [report.id]);

  const { options: shareOptions, cardReady } = useReportShare({
    reportId: report.id,
    shareUrl,
    areaName: report.areaName,
  });


  const name = report.pet?.name ?? null;
  const status = statusBadge(report.lifecycle, searchingDays, name);
  const searching = report.lifecycle === "searching";
  const mine = ownership.mine;
  // 보호자가 적어 둔 품종은 아는 값이라 그대로 씀. AI 가 붙인 값만 계열 추정으로 부름
  const breedText = report.pet?.breedGuess ?? null;

  return (
    <Screen bg="bg.layerBasement">
      <DetailPhotoHero
        reportId={report.id}
        alt={name ? `잃어버린 ${name} 사진` : "잃어버린 동물 사진"}
        onShare={() => setShareOpen(true)}
      />

      <VStack align="stretch" gap="x2" pb="x4">
        <SectionCard gap="x3">
          <HStack gap="x1_5" wrap>
            <Badge label={status.label} tone={status.tone} />
          </HStack>

          <ReportBadges
            animalType={report.animalType}
            breedGuess={report.breedGuess}
            size={report.size}
            injury={report.injury}
          />

          <VStack align="stretch" gap="x1">
            {/* 이름을 아는 신고는 이름을 맨 앞에 둠. 부르면 반응하는 것이 이름임 */}
            <Text as="h1" textStyle="t8Bold" color="fg.neutral">
              {name ? `${withObject(name)} 찾고 있어요` : describeAnimal(report)}
            </Text>
            {/* 제목이 이름을 차지했을 때만 생김새를 아래에 둠. 없으면 제목과 같은 말이 됨 */}
            {name ? (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {[breedText, describeAnimal(report)].filter(Boolean).join(", ")}
              </Text>
            ) : breedText ? (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {breedText}
              </Text>
            ) : null}
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {report.areaName ?? "지역 미확인"}에서 {sinceLabel} 마지막으로 봤어요
            </Text>
          </VStack>

          <Divider />

          <HStack gap="x2" align="center">
            <Avatar
              size="24"
              alt=""
              fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
            />
            {/* 내 신고를 내가 열었을 때 보호자가 라고 쓰면 남이 적은 글처럼 읽힘 */}
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {mine ? "내가" : "보호자가"} {formatAbsolute(report.occurredAt)}에 마지막으로 봄
            </Text>
          </HStack>
        </SectionCard>

        {/* 내 신고를 열었을 때 가장 먼저 할 일이 후보 확인이라 맨 위에 둠 */}
        {ownership.mine ? (
          <LostOwnerPanel
            reportId={report.id}
            version={report.version}
            lifecycle={report.lifecycle}
            canManage={ownership.canManage}
            name={name}
            matchAlert={report.matchAlert}
          />
        ) : null}

        <SectionCard gap="x2">
          <SectionTitle>{mine ? "내가 적은 모습" : "보호자가 적은 모습"}</SectionTitle>
          <Text textStyle="articleBody" color="fg.neutral" whiteSpace="pre-wrap">
            {report.appearance ?? "외형 설명이 없어요"}
          </Text>
        </SectionCard>

        {/* 묻지 않은 칸까지 확인 어려움 으로 세우면 아는 것이 없는 신고처럼 보임 */}
        <ReportFeatures report={report} breedText={breedText} hideEmpty />

        <SectionCard gap="x2">
          <SectionTitle>{mine ? "내가 마지막으로 본 곳" : "마지막으로 본 곳"}</SectionTitle>
          <Text textStyle="t5Bold" color="fg.neutral">
            {report.areaName ?? "위치 미확인"}
          </Text>
          {report.landmarkNote ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {report.landmarkNote}
            </Text>
          ) : null}
          {location ? (
            <TrackMap
              origin={location.point}
              gridMeters={location.gridMeters}
              destinationName={report.areaName ?? "마지막 목격 위치"}
              nodes={searching ? (track?.nodes ?? []) : []}
              prediction={searching ? (track?.prediction ?? null) : null}
            />
          ) : null}
          {/* 지도의 점과 번호가 어느 지역 어느 시각인지는 글로 한 번 더 읽어야 남음 */}
          {location && searching && track ? (
            <TrackTimeline
              origin={{ areaName: report.areaName, occurredAt: report.occurredAt }}
              nodes={track.nodes}
            />
          ) : null}
          {report.areaName ? (
            <AreaSubscribeButton
              reportId={report.id}
              areaName={report.areaName}
              subscribed={areaSubscribed}
            />
          ) : null}
        </SectionCard>

        {/* 마지막으로 본 곳 바로 다음이 다음에 갈 곳이라 경로를 이어 붙임 */}
        {/* 내 신고인지와 무관하게 보여 이웃도 어디를 찾을지 알게 함 */}
        {location && searching ? (
          <TrackSection status={trackStatus} track={track} />
        ) : null}

        {/* 실종 신고에서 보호소는 맡길 곳이 아니라 찾아볼 곳임 */}
        <ReportShelters
          items={shelters}
          title={name ? `${withSubject(name)} 여기 있을 수도 있어요` : "여기 있을 수도 있어요"}
          description="보호소에 들어와 있는 경우가 많아요. 가까운 곳부터 전화해 보세요"
        />

        {nearby.length > 0 ? (
          <SectionCard gap="x3">
            <HStack asChild justify="space-between" align="center" gap="x2">
              <Link href="/reports">
                <SectionTitle>이 근처에서 발견된 동물</SectionTitle>
                <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
              </Link>
            </HStack>
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
          {/* 목격담이 모이는 자리라 무엇을 적어야 하는지 먼저 알림 */}
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {mine
              ? "이웃이 본 곳을 여기에 적어 줘요"
              : `${name ? `${withObject(name)}` : "비슷한 동물을"} 봤다면 언제 어디서 봤는지 적어 주세요`}
          </Text>
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
          {/* 내가 올린 글을 내가 신고할 일은 없음 */}
          {mine ? null : (
            <ActionButton variant="ghost" size="small" onClick={() => setFlagOpen(true)}>
              이 신고 신고하기
            </ActionButton>
          )}
        </SectionCard>
      </VStack>

      {/* 이 화면을 보는 사람이 할 수 있는 일은 목격 제보 하나라 그것만 주 버튼으로 둠 */}
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
        {/* 내 신고에 내가 목격 제보를 하지는 않음. 관리 줄이 위에서 할 일을 맡음 */}
        {/* 이미 찾은 신고에 목격 제보를 권하면 헛걸음이 됨 */}
        {mine ? (
          <ActionButton variant="neutralWeak" size="medium" onClick={() => setShareOpen(true)}>
            <Icon svg={<IconAndroidshareLine />} />
            이웃에게 알리기
          </ActionButton>
        ) : searching ? (
          <ActionButton variant="brandSolid" size="medium" asChild>
            <Link href="/report">
              <Icon svg={<IconMagnifyingglassLine />} />
              {name ? `${withObject(name)} 봤어요` : "이 아이 봤어요"}
            </Link>
          </ActionButton>
        ) : (
          <ActionButton variant="neutralWeak" size="medium" asChild>
            <Link href="/reports">다른 기록 보기</Link>
          </ActionButton>
        )}
      </HStack>

      <ReportShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        options={shareOptions}
        cardReady={cardReady}
      />

      <ReportFlagSheet reportId={report.id} open={flagOpen} onOpenChange={setFlagOpen} />
    </Screen>
  );
}
