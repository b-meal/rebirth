import Link from "next/link";
import { Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import {
  IconDot3HorizontalChatbubbleLeftLine,
  IconHeartLine,
  IconPersonFill,
} from "@karrotmarket/react-monochrome-icon";
import { Avatar } from "seed-design/ui/avatar";
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

/** 대표 사진 한 변. 글을 밀어내지 않도록 오른쪽에 작게 붙임 */
const THUMB = "72px";

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

/** 글쓴이 이름 첫 글자, 이름이 없으면 사람 아이콘 */
export function authorFallback(name: string | null) {
  return name?.slice(0, 1) ?? <Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />;
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
        <VStack align="stretch" gap="x2_5" minWidth="0">
          <HStack gap="x2" align="center">
            <Box px="x2" py="x0_5" borderRadius="r1" bg="bg.brandWeak">
              <Text textStyle="t1Bold" color="fg.brand">
                {categoryLabel(item.category)}
              </Text>
            </Box>
            {item.areaName ? (
              <Text textStyle="t1Regular" color="fg.neutralSubtle" maxLines={1}>
                {item.areaName}
              </Text>
            ) : null}
          </HStack>

          {/* 사진을 본문 옆에 두어 한 화면에 더 많은 글이 들어옴 */}
          <HStack gap="x3" align="flex-start" minWidth="0">
            {/* 띄어쓰기 없는 긴 글이 카드를 밀어내지 않게 줄 수로 끊음 */}
            <VStack align="stretch" gap="x1" grow={1} minWidth="0">
              <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
                {item.title}
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={2}>
                {preview(item.body)}
              </Text>
            </VStack>

            {item.photoUrl ? (
              <Box width={THUMB} minWidth={THUMB}>
                <ImageFrame ratio={1} src={item.photoUrl} alt="" borderRadius="r2" />
              </Box>
            ) : null}
          </HStack>

          <HStack justify="space-between" align="center" gap="x2">
            <HStack gap="x1_5" align="center" minWidth="0">
              <Avatar size="20" alt="" fallback={authorFallback(item.authorName)} />
              <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
                {item.authorName ?? "알 수 없음"} · {sinceLabel(item.createdAt)}
              </Text>
            </HStack>
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
