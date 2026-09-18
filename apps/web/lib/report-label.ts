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

/** 실종 신고가 며칠째인지. 잃어버린 날이 1일째라 당일은 숫자 대신 문장으로 말함 */
export function searchingLabel(days: number): string {
  return days <= 1 ? "오늘 잃어버렸어요" : `실종 ${days}일째`;
}

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
 * 한국 시간으로 읽은 날짜의 일련번호
 * 어제와 그저께, 며칠째는 자정 경계로 세는 값이라 경과 시간을 24로 나누면 안 됨
 * 35시간 전이 어제가 되고 38시간 전이 그저께가 되는 뒤집힘이 여기서 생김
 */
const KST_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function kstDayIndex(date: Date): number {
  // 자리 순서는 ICU 판마다 달라 종류로 집어 옮김
  const part = new Map(KST_DATE.formatToParts(date).map((p) => [p.type, p.value]));
  const day = `${part.get("year")}-${part.get("month")}-${part.get("day")}`;
  return Date.parse(`${day}T00:00:00Z`) / 86_400_000;
}

/**
 * 며칠째 찾고 있는지, 잃어버린 날이 1일째이고 자정마다 하루 오름
 * 뺄셈으로 세면 어제 저녁 신고가 20시간밖에 안 지나 오늘 잃어버린 것으로 읽힘
 * 서버에서 한 번 계산해 넘김. 화면에서 세면 다시 그릴 때마다 값이 흔들림
 */
export function searchingDays(date: Date, now: Date = new Date()): number {
  // 시계 오차로 미래 시각이 들어와도 1일째 아래로 내려가지 않음
  return Math.max(kstDayIndex(now) - kstDayIndex(date), 0) + 1;
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

/**
 * 월과 날짜만 적음
 * 공유 카드처럼 남의 캐시에 들어가는 표면에는 며칠째 같은 상대값을 넣지 않음
 * 카카오와 슬랙이 긁어 간 이미지는 우리가 지울 수 없어 3일째로 구워진 그림이 30일째에도 뿌려짐
 */
const MONTH_DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});

export function formatMonthDay(value: Date | string): string {
  return MONTH_DAY.format(new Date(value));
}

/**
 * 날짜와 시각, 연도는 빼고 적음
 * 후보 확인처럼 며칠 안의 목격끼리 견주는 자리에 씀. 연도가 붙으면 견줄 값보다 길어짐
 */
const DAY_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDayTime(value: Date | string): string {
  return DAY_TIME.format(new Date(value));
}

const RELATIVE = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/**
 * 한국 시간으로 읽은 시각대
 * 어제 만으로는 낮에 봤는지 새벽에 봤는지 알 수 없고 그 둘은 찾아갈 시간과 방법이 다름
 * h23 을 못박음. 판에 따라 자정을 24 로 내주는 구현이 있음
 */
const KST_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  hourCycle: "h23",
});

function dayPart(date: Date): string {
  const hour = Number(KST_HOUR.formatToParts(date).find((p) => p.type === "hour")?.value);
  if (hour < 6) return "새벽";
  if (hour < 12) return "아침";
  if (hour < 18) return "오후";
  return "밤";
}

/** 목격 시각을 방금, n분 전, n시간 전, 어제 오후, 그저께 새벽, n일 전 밤으로 표기 */
export function sinceLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  // 시계 오차로 미래가 되면 방금으로 눌러 표시함
  if (minutes >= -1) return "방금";
  if (minutes > -60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  // 하루가 지나지 않았으면 자정을 넘었어도 경과 시간이 달력 낱말보다 정확함
  if (hours > -24) return RELATIVE.format(hours, "hour");
  const days = kstDayIndex(date) - kstDayIndex(now);
  // 반올림으로 24시간이 됐어도 달력으로 같은 날이면 어제가 아님
  if (days === 0) return RELATIVE.format(-23, "hour");
  // 하루가 넘으면 몇 시간 전이 사라져 목록에서 낮 목격과 새벽 목격이 같아짐
  return `${RELATIVE.format(days, "day")} ${dayPart(date)}`;
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
