// catch-all 라우트의 경로 분기. 무료 배포의 함수 20개 상한에 맞추려고
// 여러 엔드포인트를 한 함수에 모음. 같은 함수를 쓰므로 콜드 스타트를 공유함
//
// 라우트 파일은 이 표만 넘기고 분기 규칙은 여기에서 한 번만 정의함

import { notFound } from "./responses";

/** catch-all 세그먼트. Next.js 가 [...path] 를 배열로 넘김 */
export type CatchAllContext = { params: Promise<{ path?: string[] }> };

/**
 * 개별 라우트 핸들러. 각자 `{ id }` 처럼 좁은 params 를 선언하므로
 * 표에 넣을 때는 그 모양을 그대로 받아들임. 실제 키는 경로 패턴이 정함
 */
type Handler<P = Record<string, string>> = (
  request: Request,
  context: { params: Promise<P> },
) => Promise<Response>;

// 표에는 params 모양이 서로 다른 핸들러가 섞임. unknown 으로 받아 호출 시점에 맞춤
type AnyHandler = Handler<never>;

/**
 * 경로 패턴. `:name` 은 한 세그먼트를 잡아 params 로 넘김
 * 예: `reports/:id/close`
 */
export type RouteTable = Record<string, AnyHandler>;

const ROUTE_NOT_FOUND = "요청한 경로가 없습니다";

type Compiled = {
  segments: string[];
  handler: AnyHandler;
};

function compile(table: RouteTable): Compiled[] {
  return Object.entries(table)
    .map(([pattern, handler]) => ({
      segments: pattern.split("/").filter(Boolean),
      handler,
    }))
    // 고정 세그먼트가 많은 패턴을 먼저 봄. `reports/:id` 가 `reports/mine` 를 가리지 않게 함
    .sort((a, b) => {
      const fixed = (c: Compiled) =>
        c.segments.filter((s) => !s.startsWith(":")).length;
      return fixed(b) - fixed(a);
    });
}

function match(
  compiled: Compiled[],
  path: string[],
): { handler: AnyHandler; params: Record<string, string> } | undefined {
  for (const route of compiled) {
    if (route.segments.length !== path.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (const [index, segment] of route.segments.entries()) {
      const value = path[index]!;
      if (segment.startsWith(":")) {
        params[segment.slice(1)] = value;
        continue;
      }
      if (segment !== value) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: route.handler, params };
  }
  return undefined;
}

/**
 * 메서드별 경로 표를 하나의 라우트 핸들러 묶음으로 만듦
 * 표에 없는 경로와 메서드는 같은 404 로 답함. 어느 쪽이 없는지 알려주지 않음
 */
export function createCatchAll(tables: {
  GET?: RouteTable;
  POST?: RouteTable;
  PATCH?: RouteTable;
  DELETE?: RouteTable;
}) {
  const compiled = {
    GET: tables.GET ? compile(tables.GET) : undefined,
    POST: tables.POST ? compile(tables.POST) : undefined,
    PATCH: tables.PATCH ? compile(tables.PATCH) : undefined,
    DELETE: tables.DELETE ? compile(tables.DELETE) : undefined,
  };

  const dispatch =
    (method: keyof typeof compiled) =>
    async (request: Request, context: CatchAllContext): Promise<Response> => {
      const routes = compiled[method];
      if (!routes) return notFound(ROUTE_NOT_FOUND);

      const { path = [] } = await context.params;
      const found = match(routes, path);
      if (!found) return notFound(ROUTE_NOT_FOUND);

      // 잡은 세그먼트를 개별 라우트와 같은 모양으로 넘겨 핸들러를 그대로 씀
      // 핸들러마다 params 키가 달라 이 지점에서만 좁혀줌
      return found.handler(request, {
        params: Promise.resolve(found.params) as Promise<never>,
      });
    };

  return {
    ...(compiled.GET && { GET: dispatch("GET") }),
    ...(compiled.POST && { POST: dispatch("POST") }),
    ...(compiled.PATCH && { PATCH: dispatch("PATCH") }),
    ...(compiled.DELETE && { DELETE: dispatch("DELETE") }),
  };
}
