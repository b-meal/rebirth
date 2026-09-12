// 브라우저가 알아낸 동네 이름을 서버도 읽을 수 있게 담아 두는 쿠키
// 위치는 브라우저만 알아 서버는 첫 화면에서 동네를 모름
// 그대로 두면 전국 목록을 그렸다가 동네를 잡은 뒤 다시 읽어 목록이 한 번 바뀜
// 좌표가 아니라 동 이름만 담음. 정확 위치는 어디에도 남기지 않음

export const AREA_COOKIE = 'rebirth_area'

/** 이사하거나 여행지에서 켠 값이 오래 남지 않을 만큼만 둠 */
export const AREA_COOKIE_MAX_AGE = 60 * 60 * 24 * 14

/** 동 이름으로 받아들일 모양. 쿠키는 사용자가 고칠 수 있어 길이와 글자를 봄 */
const AREA_SHAPE = /^[가-힣A-Za-z0-9·\s]{1,40}$/

/**
 * 쿠키에서 읽은 동네 이름을 믿을 수 있는 값으로만 통과시킴
 * 질의에 그대로 들어가는 값이라 모양을 벗어나면 동네를 모르는 것으로 다룸
 */
export function readAreaCookie(value: string | undefined): string | undefined {
  if (!value) return undefined
  const name = value.trim()
  return AREA_SHAPE.test(name) ? name : undefined
}
