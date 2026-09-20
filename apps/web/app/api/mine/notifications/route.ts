import { serverError } from "@rebirth/core/http";

import { getCurrentUser } from "@/lib/auth/session";
import {
  encodeAreaReportCursor,
  readNotificationPage,
} from "@/app/mine/notifications/notification-page";
import type { AreaReportCursor } from "@rebirth/db";

// 알림함 새 제보의 이어 읽기
// 첫 쪽은 서버 컴포넌트가 그리고 이어 읽는 쪽만 이 경로로 받음
// 읽는 규칙은 notification-page 하나에 있어 첫 쪽과 이어 읽는 쪽이 어긋나지 않음

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeCursor(value: string): AreaReportCursor | undefined {
  const separator = value.indexOf("_");
  if (separator < 0) return undefined;
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !UUID.test(id)) return undefined;
  return { createdAt, id };
}

export async function GET(request: Request): Promise<Response> {
  // 남의 알림함을 넘겨받지 않도록 계정은 세션에서만 읽음
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "로그인이 필요해요" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const raw = params.get("cursor");
  const cursor = raw ? decodeCursor(raw) : undefined;
  if (raw && !cursor) {
    return Response.json(
      {
        message: "목록을 처음부터 다시 불러와 주세요",
        fields: { cursor: "커서가 올바르지 않아요" },
      },
      { status: 400 },
    );
  }

  try {
    const page = await readNotificationPage({ userId: user.id, cursor });
    return Response.json({
      items: page.items,
      nextCursor: encodeAreaReportCursor(page.nextCursor),
    });
  } catch (error) {
    // 원인은 로그에만 남김. 목록 실패는 화면이 재시도로 다룸
    return serverError("mine.notifications.list", error);
  }
}
