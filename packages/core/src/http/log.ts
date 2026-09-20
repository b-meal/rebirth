// 서버에서 일어난 일을 남기는 단 하나의 자리
//
// 콘솔과 DB 두 곳에 남김. Vercel 무료 플랜의 런타임 로그는 한 시간만 보관돼
// 콘솔만 쓰면 어제 난 고장을 오늘 볼 수 없음. DB 쪽은 종류별로 묶어 세어 표가 커지지 않음
//
// 곳곳에서 console 을 직접 부르면 나중에 형식을 바꾸거나 외부 수집기로 보낼 때
// 부르는 곳을 전부 찾아다녀야 함. 여기 한 곳만 바꾸면 되도록 모아 둠
//
// tag 는 `기능.동작` 꼴로 적어 로그에서 한 번에 모임
// 좌표, 토큰, 키, 사진은 담지 않음. 무엇이 어디서 어긋났는지만 남김

// DB 기록은 늦게 불러옴. 이 모듈이 db 를 바로 끌면 미들웨어 같은 가벼운 자리까지 따라옴
// 실패해도 콘솔 줄은 이미 나갔고 여기서 더 할 일은 없음
let sink: Promise<typeof import("./error-sink")> | null = null;

function keep(
  level: "failure" | "notice",
  tag: string,
  error: unknown,
  context?: Record<string, string | number>,
): void {
  // 연결 정보가 없는 자리(테스트, 스토리북)에서는 콘솔까지만
  if (!process.env.DATABASE_URL) return;
  sink ??= import("./error-sink");
  void sink
    .then((module) => module.recordError(level, tag, error, context))
    .catch(() => undefined);
}

function line(tag: string, context?: Record<string, string | number>): string {
  if (!context) return `[${tag}]`;
  const pairs = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  return `[${tag}] ${pairs}`;
}

/**
 * 화면을 멈추지 않고 지나가는 실패
 *
 * 빈 목록과 기본값으로 이어 가는 자리가 많은데 그대로 삼키면
 * 사진이 통째로 빠지거나 검색이 0 건으로 보여도 제보가 없는 것인지 질의가 깨진 것인지 알 수 없음
 * 응답을 만들지 않으므로 페이지, 서버 액션, 이미지 라우트 어디서나 씀
 */
export function logFailure(
  tag: string,
  error: unknown,
  context?: Record<string, string | number>,
): void {
  console.error(line(tag, context), error);
  keep("failure", tag, error, context);
}

/** 고장은 아니지만 알고 있어야 하는 것. 설정이 빠졌거나 받아 온 양이 모자란 경우 */
export function logNotice(
  tag: string,
  message: string,
  context?: Record<string, string | number>,
): void {
  console.warn(line(tag, context), message);
  keep("notice", tag, message, context);
}
