// 모델에 넘기는 시각 표기, 프롬프트 안에서만 씀

/**
 * 한국 시간으로 적고 시간대를 글자로 밝힘
 * toISOString 을 그대로 넘기면 UTC 라 모델이 저녁 목격을 한낮으로 읽음
 * 이동 경로 해석과 후보 근거가 시각대를 들어 문장을 만들어 아홉 시간이 그대로 틀린 말로 나감
 * h23 을 못박음. 판에 따라 자정을 24 로 내주는 구현이 있음
 */
const KST = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function promptTime(date: Date): string {
  // 자리 순서는 ICU 판마다 달라 종류로 집어 옮김
  const part = new Map(KST.formatToParts(date).map((p) => [p.type, p.value]));
  const day = `${part.get("year")}-${part.get("month")}-${part.get("day")}`;
  return `${day} ${part.get("hour")}:${part.get("minute")} KST`;
}
