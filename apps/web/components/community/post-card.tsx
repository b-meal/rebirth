import Link from "next/link";
import { Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import {
  IconDot3HorizontalChatbubbleLeftLine,
  IconHeartLine,
} from "@karrotmarket/react-monochrome-icon";
import type { CommunityCategory } from "@rebirth/types";

import { categoryLabel } from "@rebirth/core/community";
import { sinceLabel } from "@/lib/report-label";

// 피드 카드. 첫 화면에서 훑고 지나가는 자리라 제목과 본문 앞부분까지만 보여 줌

export type PostCardItem = {
  id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  areaName: string | null;
  commentCount: number;
  likeCount: number;
  createdAt: Date;
  authorName: string | null;
  photoUrl: string | null;
};

/** 카드에서 보여 줄 본문 길이. 넘치면 잘라서 말줄임을 붙임 */
const PREVIEW_MAX = 80;

function preview(body: string): string {
  // 줄바꿈을 공백으로 눌러 카드가 두 줄 안에 들어오게 함
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX)}…` : flat;
}

function Count({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <HStack gap="x1" align="center">
      <Icon svg={icon} size="x4" color="fg.neutralSubtle" />
      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        {value}
      </Text>
    </HStack>
  );
}

export function PostCard({ item }: { item: PostCardItem }) {
  return (
    <Box
      asChild
      p="x4"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerDefault"
      // 내용이 길어도 카드가 넓어지지 않게 함. 이게 없으면 자식의 줄 수 제한이 듣지 않음
      minWidth="0"
    >
      {/* 링크로 두어 키보드 이동과 새 탭 열기가 그대로 동작함 */}
      {/* 카드 전체가 누르는 자리라 마우스와 키보드에 반응을 줌 */}
      <Link href={`/community/${item.id}`} className="rebirth-card">
        <VStack align="stretch" gap="x2" minWidth="0">
          <HStack gap="x2" align="center">
            <Box px="x2" py="x0_5" borderRadius="r1" bg="bg.neutralWeak">
              <Text textStyle="t1Bold" color="fg.neutralMuted">
                {categoryLabel(item.category)}
              </Text>
            </Box>
            {item.areaName ? (
              <Text textStyle="t1Regular" color="fg.neutralSubtle">
                {item.areaName}
              </Text>
            ) : null}
          </HStack>

          {/* 띄어쓰기 없는 긴 글이 카드를 밀어내지 않게 줄 수로 끊음 */}
          <VStack align="stretch" gap="x1" minWidth="0">
            <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
              {item.title}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={2}>
              {preview(item.body)}
            </Text>
          </VStack>

          {item.photoUrl ? (
            <ImageFrame ratio={16 / 9} src={item.photoUrl} alt="" borderRadius="r2" />
          ) : null}

          <HStack justify="space-between" align="center">
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              {item.authorName ?? "알 수 없음"} · {sinceLabel(item.createdAt)}
            </Text>
            <HStack gap="x3" align="center">
              <Count icon={<IconHeartLine />} value={item.likeCount} />
              <Count
                icon={<IconDot3HorizontalChatbubbleLeftLine />}
                value={item.commentCount}
              />
            </HStack>
          </HStack>
        </VStack>
      </Link>
    </Box>
  );
}
