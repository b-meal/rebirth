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

// web 과 같은 다섯 어휘 기준. unknown 만 값이 없어 admin 의 확인 어려움 표기를 씀
export const CARE_LABEL: Record<string, string> = {
  roaming: "발견",
  in_care: "보호 중",
  unknown: "확인 어려움",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  public: "공개",
  hidden: "숨김",
  deleted: "삭제",
};

// searching 과 resolved 는 실종 신고 쪽이라 다섯 어휘를 그대로 씀
export const LIFECYCLE_LABEL: Record<string, string> = {
  active: "진행 중",
  closed: "종료",
  searching: "실종",
  resolved: "찾음",
};

export const LOCATION_SOURCE_LABEL: Record<string, string> = {
  gps: "GPS",
  place: "장소 검색",
  manual_area: "지역 직접 선택",
};

const pad = (value: number) => String(value).padStart(2, "0");

/** 날짜와 분까지. 초는 운영 판단에 쓰이지 않음 */
export function when(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
