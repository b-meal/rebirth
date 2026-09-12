import { getCurrentUser } from "@/lib/auth/session";
import {
  encodeMineCursor,
  readMineReportPage,
  type MineCursor,
} from "@/app/mine/reports/report-page";

// 내 기록 목록의 이어 읽기
// 첫 쪽은 서버 컴포넌트가 그리고 이어 읽는 쪽만 이 경로로 받음
// 읽는 규칙은 report-page 하나에 있어 첫 쪽과 이어 읽는 쪽이 어긋나지 않음

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeCursor(value: string): MineCursor | undefined {
  const separator = value.indexOf("_");
  if (separator < 0) return undefined;
  const occurredAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(occurredAt.getTime()) || !UUID.test(id)) return undefined;
  return { occurredAt, id };
}

export async function GET(request: Request): Promise<Response> {
  // 남의 기록을 넘겨받지 않도록 계정은 세션에서만 읽음
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "로그인이 필요합니다" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") === "lost" ? "lost" : "sighting";

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
    const page = await readMineReportPage({ userId: user.id, kind, cursor });
    return Response.json({
      items: page.items,
      nextCursor: encodeMineCursor(page.nextCursor),
    });
  } catch {
    // 원인을 그대로 내보내지 않음. 목록 실패는 화면이 재시도로 다룸
    return Response.json({ message: "목록을 불러오지 못했습니다" }, { status: 500 });
  }
}
