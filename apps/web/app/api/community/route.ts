import { findCategory } from "@rebirth/core/community";

import { toFeedItems } from "@/app/community/feed-item";
import { encodeFeedCursor, readFeedPage, type FeedCursor } from "@/app/community/feed-page";

// 커뮤니티 피드의 더 보기
// 첫 쪽은 서버 컴포넌트가 그리고 이어 읽는 쪽만 이 경로로 받음
// 읽는 규칙은 feed-page 하나에 있어 첫 쪽과 이어 읽는 쪽이 어긋나지 않음

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 목록 커서. 제보 목록의 "시각_id" 앞에 구간을 붙임
 * 구간이 없으면 이어 읽을 때 내 동네를 계속 읽을지 나머지로 넘어갈지 알 수 없음
 * 동네를 넘기지 않는 호출은 앞 규약 그대로라 접두사 없이도 읽힘
 */
function decodeCursor(value: string): FeedCursor | undefined {
  const [head, ...rest] = value.split(":");
  const segment = head === "far" ? "far" : "near";
  const body = head === "near" || head === "far" ? rest.join(":") : value;

  const separator = body.indexOf("_");
  if (separator < 0) return undefined;
  const createdAt = new Date(body.slice(0, separator));
  const id = body.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !UUID.test(id)) return undefined;
  return { segment, createdAt, id };
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const category = findCategory(params.get("category"))?.id;
  // 빈 문자열은 동네를 모르는 것과 같게 다룸
  const areaName = params.get("areaName")?.trim() || undefined;

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
    const page = await readFeedPage({ category, areaName, cursor });
    return Response.json({
      items: await toFeedItems(page.rows),
      nextCursor: encodeFeedCursor(page.nextCursor),
      nearCount: page.nearCount,
    });
  } catch {
    // 원인을 그대로 내보내지 않음. 목록 실패는 화면이 재시도 버튼으로 다룸
    return Response.json(
      { message: "목록을 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}
