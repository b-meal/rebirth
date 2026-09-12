import { findCategory } from "@rebirth/core/community";
import { COMMUNITY_PAGE_SIZE, listCommunityPosts } from "@rebirth/db";

import { toFeedItems } from "@/app/community/feed-item";

// 커뮤니티 피드의 더 보기
// 첫 쪽은 서버 컴포넌트가 그리고 이어 읽는 쪽만 이 경로로 받음

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 목록 커서. 제보 목록과 같은 "시각_id" 규약 */
function decodeCursor(value: string): { createdAt: Date; id: string } | undefined {
  const separator = value.indexOf("_");
  if (separator < 0) return undefined;
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !UUID.test(id)) return undefined;
  return { createdAt, id };
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const category = findCategory(params.get("category"))?.id;

  const raw = params.get("cursor");
  const cursor = raw ? decodeCursor(raw) : undefined;
  if (raw && !cursor) {
    return Response.json(
      {
        message: "목록을 처음부터 다시 불러와 주십시오",
        fields: { cursor: "커서가 올바르지 않습니다" },
      },
      { status: 400 },
    );
  }

  try {
    // 한 건 더 읽어 다음 쪽 존재를 판단함. 총 건수 질의를 피함
    const rows = await listCommunityPosts({
      category,
      cursor,
      limit: COMMUNITY_PAGE_SIZE + 1,
    });

    const hasMore = rows.length > COMMUNITY_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, COMMUNITY_PAGE_SIZE) : rows;
    const last = page.at(-1);

    return Response.json({
      items: await toFeedItems(page),
      nextCursor:
        hasMore && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
    });
  } catch {
    // 원인을 그대로 내보내지 않음. 목록 실패는 화면이 재시도 버튼으로 다룸
    return Response.json(
      { message: "목록을 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}
