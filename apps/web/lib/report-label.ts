import type { AnimalType } from "@rebirth/types";

// 목록과 지도가 같은 문구를 쓰게 모아 둔 표기 규칙

export const SIZE_LABEL: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "",
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

const RELATIVE = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/** 목격 시각을 방금·n분 전·n시간 전·n일 전으로 표기 */
export function sinceLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  // 시계 오차로 미래가 되면 방금으로 눌러 표시함
  if (minutes >= -1) return "방금";
  if (minutes > -60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}
