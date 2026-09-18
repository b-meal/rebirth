// 서버에서 일어난 일을 남기는 단 하나의 자리
//
// 곳곳에서 console 을 직접 부르면 나중에 형식을 바꾸거나 외부 수집기로 보낼 때
// 부르는 곳을 전부 찾아다녀야 함. 여기 한 곳만 바꾸면 되도록 모아 둠
//
// tag 는 `기능.동작` 꼴로 적어 로그에서 한 번에 모임
// 좌표, 토큰, 키, 사진은 담지 않음. 무엇이 어디서 어긋났는지만 남김

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
}

/** 고장은 아니지만 알고 있어야 하는 것. 설정이 빠졌거나 받아 온 양이 모자란 경우 */
export function logNotice(
  tag: string,
  message: string,
  context?: Record<string, string | number>,
): void {
  console.warn(line(tag, context), message);
}
