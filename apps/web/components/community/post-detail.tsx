// design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음
import Link from "next/link";
import {
  Box,
  Divider,
  HStack,
  Icon,
  ImageFrame,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconLocationpinLine,
  IconPawprintLine,
  IconPersonFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import type { CommunityCategory } from "@rebirth/types";

import { categoryLabel } from "@rebirth/core/community";

import { deletePost } from "@/app/community/actions";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { sinceLabel } from "@/lib/report-label";
import { LikeButton } from "./like-button";
import {
  CommentComposer,
  PostComments,
  type PostCommentItem,
} from "./post-comments";

// 글 한 편. 본문을 그대로 읽고 아래에서 이야기를 이어 가는 자리

export type PostDetailProps = {
  post: {
    id: string;
    category: CommunityCategory;
    title: string;
    body: string;
    areaName: string | null;
    createdAt: Date;
    authorName: string | null;
    authorAvatarUrl: string | null;
    reportId: string | null;
  };
  photoUrls: string[];
  comments: PostCommentItem[];
  like: { count: number; mine: boolean };
  /** 이 글을 쓴 사람이 보고 있는지. 삭제 버튼이 여기서 갈림 */
  isAuthor: boolean;
  signedIn: boolean;
};

export function PostDetail({
  post,
  photoUrls,
  comments,
  like,
  isAuthor,
  signedIn,
}: PostDetailProps) {
  return (
    <Screen>
      {/* 상세에는 하단 탭이 없어 헤더가 없으면 되돌아갈 길이 사라짐 */}
      <AppHeader title="커뮤니티" />
      <ScreenBody gap="x5">
        <VStack align="stretch" gap="x3">
          <HStack gap="x2" align="center">
            <Box px="x2" py="x0_5" borderRadius="r1" bg="bg.neutralWeak">
              <Text textStyle="t1Bold" color="fg.neutralMuted">
                {categoryLabel(post.category)}
              </Text>
            </Box>
            {post.areaName ? (
              <HStack gap="x1" align="center">
                <Icon svg={<IconLocationpinLine />} size="x4" color="fg.neutralSubtle" />
                <Text textStyle="t1Regular" color="fg.neutralSubtle">
                  {post.areaName}
                </Text>
              </HStack>
            ) : null}
          </HStack>

          <Text
            as="h1"
            textStyle="t7Bold"
            color="fg.neutral"
            style={{ overflowWrap: "anywhere" }}
          >
            {post.title}
          </Text>

          <HStack gap="x2" align="center">
            <Avatar
              size="36"
              src={post.authorAvatarUrl ?? undefined}
              alt=""
              fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
            />
            <VStack align="stretch" gap="x0_5">
              <Text textStyle="t3Bold" color="fg.neutral">
                {post.authorName ?? "알 수 없음"}
              </Text>
              <Text textStyle="t2Regular" color="fg.neutralSubtle">
                {sinceLabel(post.createdAt)}
              </Text>
            </VStack>
          </HStack>
        </VStack>

        {/* pre-wrap 은 줄바꿈 문자만 살릴 뿐 띄어쓰기 없는 긴 글을 끊지 못함 */}
        {/* overflowWrap 이 SEED prop 에 없어 이 값만 style 로 둠 */}
        <Text
          textStyle="t4Regular"
          color="fg.neutral"
          whiteSpace="pre-wrap"
          style={{ overflowWrap: "anywhere" }}
        >
          {post.body}
        </Text>

        {photoUrls.length > 0 ? (
          <VStack align="stretch" gap="x2">
            {photoUrls.map((url) => (
              <ImageFrame key={url} ratio={4 / 3} src={url} alt="" borderRadius="r2" />
            ))}
          </VStack>
        ) : null}

        {post.reportId ? (
          <Box
            asChild
            p="x4"
            borderRadius="r3"
            borderWidth={1}
            borderColor="stroke.neutralMuted"
            bg="bg.layerDefault"
          >
            <Link href={`/r/${post.reportId}`}>
              <HStack gap="x2" align="center">
                <Icon svg={<IconPawprintLine />} color="fg.neutralMuted" />
                <VStack align="stretch" gap="x0_5">
                  <Text textStyle="t4Bold" color="fg.neutral">
                    이 글과 이어진 발견 제보
                  </Text>
                  <Text textStyle="t2Regular" color="fg.neutralMuted">
                    제보 내용을 확인해 보세요
                  </Text>
                </VStack>
              </HStack>
            </Link>
          </Box>
        ) : null}

        <HStack justify="space-between" align="center">
          <LikeButton postId={post.id} count={like.count} mine={like.mine} />
          {isAuthor ? (
            <form action={deletePost}>
              <input type="hidden" name="postId" value={post.id} />
              <ActionButton type="submit" variant="neutralWeak" size="xsmall">
                삭제
              </ActionButton>
            </form>
          ) : null}
        </HStack>

        <Divider />

        <Section gap="x4">
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            댓글 {comments.length}
          </Text>
          <PostComments comments={comments} />
          <CommentComposer postId={post.id} signedIn={signedIn} />
        </Section>

        {/* 하단 탭이 가리지 않도록 여백을 둠 */}
        <Box height="x16" />
      </ScreenBody>
    </Screen>
  );
}
