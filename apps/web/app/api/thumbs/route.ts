import { isUuid, ok } from "@rebirth/core/http";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listReportCards } from "@rebirth/db";

// 홈 마커처럼 id 만 들고 있는 화면이 화면에 든 제보의 축소 사진 주소를 묶어 받음
// 마커마다 서명 URL 을 실어 보내면 550자씩 1,400 건이라 페이로드의 절반이 사진 주소가 됨
// 공개 상태인 제보의 첫 사진만 서명하고 저장 경로는 응답에 넣지 않음

// 한 화면에 든 핀과 카드 수에 여유를 둔 상한. 장부가 이 크기로 나눠 보냄
const MAX_IDS = 60;

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter(isUuid))].slice(0, MAX_IDS);
  if (ids.length === 0) return ok({ thumbs: {} });

  const rows = await listReportCards(ids);
  const paths = [...new Set(rows.flatMap((row) => (row.photoPath ? [row.photoPath] : [])))];
  const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

  // 묻지 않은 id 는 넣지 않고, 사진이 없거나 비공개면 null 로 답해 되묻지 않게 함
  const thumbs: Record<string, string | null> = {};
  for (const id of ids) thumbs[id] = null;
  for (const row of rows) {
    thumbs[row.id] = row.photoPath ? (signed.get(row.photoPath) ?? null) : null;
  }

  return ok({ thumbs });
}
