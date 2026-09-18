// 신고 사유 라벨은 @rebirth/types 가 단일 원천이라 여기서 다시 만들지 않음
// 운영 화면 표기. 제품 언어 규칙을 그대로 따르고 품종을 단정하지 않음

export const KIND_LABEL: Record<string, string> = {
  sighting: "발견 제보",
  lost: "실종 신고",
  sheltered: "임시보호",
};

export const ANIMAL_LABEL: Record<string, string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "확인 어려움",
};

export const SIZE_LABEL: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "확인 어려움",
};

export const CARE_LABEL: Record<string, string> = {
  roaming: "배회 중",
  in_care: "제보자가 보호 중",
  unknown: "확인되지 않음",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  public: "공개",
  hidden: "숨김",
  deleted: "삭제",
};

export const LIFECYCLE_LABEL: Record<string, string> = {
  active: "진행 중",
  closed: "종료",
  searching: "찾는 중",
  resolved: "만남",
};

export const LOCATION_SOURCE_LABEL: Record<string, string> = {
  gps: "GPS",
  place: "장소 검색",
  manual_area: "지역 직접 선택",
};

/**
 * 운영 화면의 시각 표기, 시간대를 한국으로 못박음
 * getHours 는 돌리는 쪽 시간대를 따라 서버 컴포넌트에서는 배포 서버의 UTC 로,
 * 브라우저에서는 현지로 갈려 같은 제보가 목록과 상세에서 아홉 시간 다르게 보임
 * h23 을 못박음. 판에 따라 자정을 24 로 내주는 구현이 있음
 */
const WHEN = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 날짜와 분까지. 초는 운영 판단에 쓰이지 않음 */
export function when(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  // 자리 순서는 ICU 판마다 달라 종류로 집어 옮김
  const part = new Map(WHEN.formatToParts(date).map((p) => [p.type, p.value]));
  const day = `${part.get("year")}-${part.get("month")}-${part.get("day")}`;
  return `${day} ${part.get("hour")}:${part.get("minute")}`;
}

/** 연도를 뗀 짧은 표기. 지표 칸처럼 좁은 자리에만 씀 */
export function whenShort(value: string | Date | null | undefined): string {
  const full = when(value);
  return full === "-" ? full : full.slice("YYYY-".length);
}

/** 품종은 단정하지 않고 털색과 크기로만 부름 */
export function describeAnimal(input: {
  animalType: string;
  colors: string[];
  size: string;
}): string {
  const color = input.colors.join(" ");
  if (input.animalType === "dog") {
    const size = SIZE_LABEL[input.size];
    return `${color} ${size === "확인 어려움" ? "" : size}견`.replace(/\s+/g, " ").trim();
  }
  if (input.animalType === "cat") return `${color} 고양이`.trim();
  return `${color} ${ANIMAL_LABEL[input.animalType] ?? "동물"}`.trim();
}

/** 품종은 계열 추정으로만 적음. 확정 표현을 만들지 않음 */
export function breedLabel(breedGuess: string | null): string | null {
  if (!breedGuess) return null;
  return `${breedGuess} 계열 추정`;
}
