// API 연결 전 화면 검증용. 스키마는 노션 02 아키텍처 기준

export type AnimalType = "dog" | "cat" | "other" | "unknown";
export type Size = "small" | "medium" | "large" | "unknown";
export type SightingStatus = "open" | "matched" | "hidden";
export type Custody = "roaming" | "sheltered";

export type Sighting = {
  id: string;
  animalType: AnimalType;
  appearance: string;
  colors: string[];
  size: Size;
  custody: Custody;
  conditionTags: string[];
  collar: boolean;
  injury: boolean;
  earTip: boolean;
  areaName: string;
  status: SightingStatus;
  sightedAt: string;
  aiEditedFields: string[];
  candidateCount: number;
};

export type LostPet = {
  id: string;
  animalType: AnimalType;
  colors: string[];
  size: Size;
  features: string;
  lastSeenArea: string;
  lastSeenAt: string;
  status: "searching" | "resolved";
  candidateCount: number;
};

export type MatchBreakdown = {
  distance: number;
  time: number;
  color: number;
  size: number;
  feature: number;
};

export type Match = {
  lostId: string;
  sightingId: string;
  score: number;
  breakdown: MatchBreakdown;
  reason: string;
};

export const ANIMAL_LABEL: Record<AnimalType, string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "알 수 없음",
};

export const SIZE_LABEL: Record<Size, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "알 수 없음",
};

export const CUSTODY_LABEL: Record<Custody, string> = {
  roaming: "배회 중",
  sheltered: "제보자 보호 중",
};

export const STATUS_LABEL: Record<SightingStatus, string> = {
  open: "공개",
  matched: "후보 있음",
  hidden: "숨김",
};

export const SIGHTINGS: Sighting[] = [
  {
    id: "9f1c0c7a-1a00-4000-8000-000000000001",
    animalType: "dog",
    appearance: "흰색 소형견, 말티즈 계열 추정. 털이 길고 엉킴",
    colors: ["흰색"],
    size: "small",
    custody: "roaming",
    conditionTags: ["배회 중", "사람을 피함"],
    collar: false,
    injury: false,
    earTip: false,
    areaName: "서울 마포구 서교동",
    status: "matched",
    sightedAt: "2026-09-08 07:40",
    aiEditedFields: ["colors"],
    candidateCount: 2,
  },
  {
    id: "9f1c0c7a-1a00-4000-8000-000000000002",
    animalType: "cat",
    appearance: "노란 줄무늬 고양이. 귀 끝이 잘려 있음",
    colors: ["노란색", "흰색"],
    size: "small",
    custody: "roaming",
    conditionTags: ["한곳에 머묾"],
    collar: false,
    injury: false,
    earTip: true,
    areaName: "서울 마포구 연남동",
    status: "open",
    sightedAt: "2026-09-08 06:15",
    aiEditedFields: [],
    candidateCount: 0,
  },
  {
    id: "9f1c0c7a-1a00-4000-8000-000000000003",
    animalType: "dog",
    appearance: "갈색 중형견. 빨간 하네스 착용, 뒷다리를 절뚝임",
    colors: ["갈색"],
    size: "medium",
    custody: "sheltered",
    conditionTags: ["절뚝이며 걸음", "사람에게 다가옴"],
    collar: true,
    injury: true,
    earTip: false,
    areaName: "경기 고양시 덕양구 화정동",
    status: "matched",
    sightedAt: "2026-09-07 21:05",
    aiEditedFields: ["size", "condition"],
    candidateCount: 1,
  },
  {
    id: "9f1c0c7a-1a00-4000-8000-000000000004",
    animalType: "unknown",
    appearance: "사진이 어두워 종류를 판단하지 못함",
    colors: [],
    size: "unknown",
    custody: "roaming",
    conditionTags: ["밤에 발견", "차도 근처"],
    collar: false,
    injury: false,
    earTip: false,
    areaName: "인천 서구 청라동",
    status: "hidden",
    sightedAt: "2026-09-07 23:48",
    aiEditedFields: [],
    candidateCount: 0,
  },
];

export const LOST_PETS: LostPet[] = [
  {
    id: "5b2e77aa-2b00-4000-8000-000000000001",
    animalType: "dog",
    colors: ["흰색"],
    size: "small",
    features: "왼쪽 귀에 갈색 반점, 분홍 목줄",
    lastSeenArea: "서울 마포구 서교동",
    lastSeenAt: "2026-09-08 04:30",
    status: "searching",
    candidateCount: 2,
  },
  {
    id: "5b2e77aa-2b00-4000-8000-000000000002",
    animalType: "dog",
    colors: ["갈색"],
    size: "medium",
    features: "빨간 하네스, 중성화 완료",
    lastSeenArea: "경기 고양시 덕양구",
    lastSeenAt: "2026-09-07 18:00",
    status: "searching",
    candidateCount: 1,
  },
  {
    id: "5b2e77aa-2b00-4000-8000-000000000003",
    animalType: "cat",
    colors: ["검정색"],
    size: "small",
    features: "목에 흰 무늬",
    lastSeenArea: "서울 은평구 응암동",
    lastSeenAt: "2026-09-05 09:20",
    status: "resolved",
    candidateCount: 0,
  },
];

export const MATCHES: Match[] = [
  {
    lostId: "5b2e77aa-2b00-4000-8000-000000000001",
    sightingId: "9f1c0c7a-1a00-4000-8000-000000000001",
    score: 82,
    breakdown: { distance: 31, time: 22, color: 20, size: 10, feature: 0 },
    reason: "마지막 위치에서 1.2km, 실종 3시간 뒤 목격, 흰색 소형견 특징 일치",
  },
  {
    lostId: "5b2e77aa-2b00-4000-8000-000000000002",
    sightingId: "9f1c0c7a-1a00-4000-8000-000000000003",
    score: 74,
    breakdown: { distance: 28, time: 18, color: 20, size: 5, feature: 3 },
    reason: "마지막 위치에서 2.4km, 실종 3시간 뒤 목격, 갈색과 하네스 일치",
  },
];

export type ModerationItem = {
  sightingId: string;
  reason: string;
  reportedAt: string;
  reportCount: number;
};

// 신고가 들어와 숨김 대기인 제보
export const MODERATION_QUEUE: ModerationItem[] = [
  {
    sightingId: "9f1c0c7a-1a00-4000-8000-000000000004",
    reason: "사진에 동물이 보이지 않음",
    reportedAt: "2026-09-08 00:10",
    reportCount: 3,
  },
  {
    sightingId: "9f1c0c7a-1a00-4000-8000-000000000002",
    reason: "같은 개체 중복 제보로 보임",
    reportedAt: "2026-09-08 08:02",
    reportCount: 1,
  },
];

export const METRICS = [
  { label: "AI 초안 수정률", value: "24%", source: "ai_edited_fields", note: "낮을수록 초안이 정확" },
  { label: "제보 완주율", value: "68%", source: "4단계 폼 이탈", note: "사진 단계 이탈이 가장 큼" },
  { label: "분석 1건 비용", value: "11원", source: "Anthropic usage", note: "Sonnet 5 기준" },
] as const;

export const OVERVIEW = [
  { label: "오늘 제보", value: String(SIGHTINGS.length), source: "sightings" },
  { label: "검수 대기", value: String(MODERATION_QUEUE.length), source: "status open" },
  { label: "실종 신고", value: String(LOST_PETS.filter((l) => l.status === "searching").length), source: "lost_pets" },
  { label: "확인할 후보", value: String(MATCHES.length), source: "match_scores" },
] as const;
