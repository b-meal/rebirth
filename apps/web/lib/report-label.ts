import type { AnimalType } from "@rebirth/types";
import { bareBreed } from "@rebirth/core/reports/breed";

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

// 주어 없는 다섯 어휘로 고정, 배회 중과 찾는 중 금지
export const STATUS_LABEL: Record<string, string> = {
  lost: "실종",
  roaming: "발견",
  in_care: "보호 중",
  rescue: "구조 요청",
  resolved: "찾음",
  unknown: "",
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
  // 꼬리말이 붙어 저장된 값이 남아 있어 두 번 붙이지 않음
  const bare = bareBreed(breedGuess);
  return bare ? `${bare} 계열 추정` : null;
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

/**
 * 목격 시각을 그대로 적음
 * 시간대를 한국으로 못박음. 서버가 UTC 로 그리고 브라우저가 현지로 다시 그리면
 * 첫 화면과 하이드레이션 뒤 값이 달라지고, 자바스크립트 없이 보는 쪽은 틀린 시각만 봄
 */
const ABSOLUTE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatAbsolute(value: Date | string): string {
  return ABSOLUTE.format(new Date(value));
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

export type UrgencyLevel = "fresh" | "recent" | "stale" | "cold";

/** 마지막 목격부터 지난 시간을 6, 24, 72 시간 경계로 네 등급에 넣음 */
export function urgencyLevel(date: Date, now: Date = new Date()): UrgencyLevel {
  const hours = (now.getTime() - date.getTime()) / 3_600_000;
  // 시계 오차로 미래 시각이 들어와도 등급 역전 방지
  if (hours < 6) return "fresh";
  if (hours < 24) return "recent";
  if (hours < 72) return "stale";
  return "cold";
}

// 숫자를 빼고 지금 할 행동만 남긴 등급 문구
export const URGENCY_HINT: Record<UrgencyLevel, string> = {
  fresh: "지금 주변을 확인해 보세요",
  recent: "주변 추가 제보를 확인해 보세요",
  stale: "마지막 목격지 주변 이동 경로를 확인해 보세요",
  cold: "이동 가능 지역을 넓혀 찾아보세요",
};

/** 목격 시각을 지금 할 행동 한 줄로 옮김 */
export function urgencyHint(date: Date, now: Date = new Date()): string {
  return URGENCY_HINT[urgencyLevel(date, now)];
}

/** 예측 반경 안 제보 수를 한 줄로 옮김, 0건도 빈칸 대신 문장으로 말함 */
export function densityLine({ count, radiusKm }: { count: number; radiusKm: number }): string {
  const r = radiusKm.toFixed(1);
  if (count === 0) return `반경 ${r}km 안에 새 제보가 없어요`;
  return `반경 ${r}km 안에 제보 ${count}건`;
}

export type SituationInput = {
  lastSeen: Date;
  /** 예측 반경 안 제보 수, 경로가 없으면 null 이라 밀도 절이 빠짐 */
  count: number | null;
  radiusKm: number | null;
  now?: Date;
};

/** 경과·밀도·등급 세 줄을 한 줄로 합침, 절대 날짜는 다른 줄이 맡음 */
export function situationLine({ lastSeen, count, radiusKm, now = new Date() }: SituationInput): string {
  const density = count !== null && radiusKm !== null ? densityLine({ count, radiusKm }) : null;
  return [sinceLabel(lastSeen, now), density, urgencyHint(lastSeen, now)]
    .filter(Boolean)
    .join(", ");
}
