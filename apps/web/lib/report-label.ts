import type { AnimalType } from "@rebirth/types";

// 목록과 지도가 같은 문구를 쓰게 모아 둔 표기 규칙

export const SIZE_LABEL: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "",
};

export const ANIMAL_LABEL: Record<string, string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "확인 어려움",
};

export const CARE_LABEL: Record<string, string> = {
  roaming: "배회 중",
  in_care: "제보자가 보호 중",
  unknown: "확인되지 않음",
};

export type AnimalLabelInput = {
  animalType: AnimalType;
  colors: string[];
  size: string;
};

// 품종은 단정하지 않고 털색과 크기로만 부름
export function describeAnimal({ animalType, colors, size }: AnimalLabelInput): string {
  const color = colors.join(" ");
  if (animalType === "dog") return `${color} ${SIZE_LABEL[size] ?? ""}견`.trim();
  if (animalType === "cat") return `${color} 고양이`.trim();
  return `${color} 동물`.trim();
}

/** 품종은 단정하지 않음, AI 라벨링 값도 계열 추정으로만 부름 */
export function breedLabel(breedGuess: string | null): string | null {
  return breedGuess ? `${breedGuess} 계열 추정` : null;
}

// 있음, 없음, 모름 3값을 화면 문구로 옮김, null 이 모름이고 false 와 다름
export function triStateLabel(value: boolean | null, yes: string, no: string): string {
  if (value === true) return yes;
  if (value === false) return no;
  return "모름";
}

/** 이름 끝소리에 받침이 있는지. 조사를 고르는 데만 씀 */
function hasFinalConsonant(name: string): boolean {
  const last = name.charCodeAt(name.length - 1);
  // 한글 음절이 아니면 받침 없는 쪽으로 두어도 어색하지 않음
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

/** 몰리를, 콩이를 처럼 목적격 조사를 붙임 */
export function withObject(name: string): string {
  return `${name}${hasFinalConsonant(name) ? "을" : "를"}`;
}

/** 몰리가, 콩이가 처럼 주격 조사를 붙임 */
export function withSubject(name: string): string {
  return `${name}${hasFinalConsonant(name) ? "이" : "가"}`;
}

/**
 * 마지막 목격부터 지난 날수, 실종 신고가 며칠째인지 세는 값
 * 서버에서 한 번 계산해 넘김. 화면에서 세면 다시 그릴 때마다 값이 흔들림
 */
export function searchingDays(date: Date, now: Date = new Date()): number {
  return Math.max(Math.floor((now.getTime() - date.getTime()) / 86_400_000), 0);
}

const RELATIVE = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/** 목격 시각을 방금, n분 전, n시간 전, n일 전으로 표기 */
export function sinceLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  // 시계 오차로 미래가 되면 방금으로 눌러 표시함
  if (minutes >= -1) return "방금";
  if (minutes > -60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}
