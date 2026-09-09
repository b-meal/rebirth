import type {
  AnimalSize,
  AnimalType,
  CareSituation,
  ReportKind,
  ReportStatus,
} from "@rebirth/types";

// API 연결 전 화면 검증용. packages/db 의 findPublicReport 반환 형태를 따름
// 정확 좌표·관리 토큰·제보자 정보는 공개 DTO 에 없으므로 여기에도 두지 않음

export type PublicPhoto = {
  id: string;
  // 실제로는 Storage 서명 URL. 목에서는 인라인 이미지
  url: string;
  alt: string;
};

export type PublicReportDetail = {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  careSituation: CareSituation;
  animalType: AnimalType;
  appearance: string | null;
  colors: string[];
  size: AnimalSize;
  conditionTags: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  // 행정동까지만. 상세 주소와 좌표는 공개하지 않음
  areaName: string | null;
  occurredAt: string;
  // 확인할 후보 수. 반환이 확정됐다는 뜻이 아님
  candidateCount: number;
  // AI 초안을 사용자가 고쳤는지 표시
  aiDrafted: boolean;
  photos: PublicPhoto[];
};

export const ANIMAL_TYPE_LABEL: Record<AnimalType, string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "알 수 없음",
};

export const SIZE_LABEL: Record<AnimalSize, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "알 수 없음",
};

export const CARE_SITUATION_LABEL: Record<CareSituation, string> = {
  roaming: "배회 중",
  in_care: "제보자가 보호 중",
  unknown: "확인되지 않음",
};

const placeholderPhoto = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#e5e7eb"/><text x="2" y="1.7" font-size="0.3" text-anchor="middle" fill="#9ca3af">${label}</text></svg>`,
  )}`;

const MOCK_REPORTS: PublicReportDetail[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "sighting",
    status: "open",
    careSituation: "roaming",
    animalType: "dog",
    appearance: "털이 길고, 목줄은 확인하지 못했어요.",
    colors: ["흰색"],
    size: "small",
    conditionTags: ["한곳에 머묾", "사람을 피함"],
    collar: null,
    injury: false,
    earTip: null,
    areaName: "서울 강남구 역삼동",
    occurredAt: "2026-09-09T04:20:00.000Z",
    candidateCount: 2,
    aiDrafted: true,
    photos: [{ id: "p1", url: placeholderPhoto("사진"), alt: "흰색 소형견" }],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    kind: "sighting",
    status: "open",
    careSituation: "in_care",
    animalType: "cat",
    appearance: "귀 끝이 잘려 있는지는 확인하지 못했어요.",
    colors: ["검정", "흰색"],
    size: "small",
    conditionTags: ["차도 근처"],
    collar: false,
    injury: true,
    earTip: null,
    areaName: "부산 해운대구 우동",
    occurredAt: "2026-09-08T22:05:00.000Z",
    candidateCount: 0,
    aiDrafted: false,
    photos: [{ id: "p2", url: placeholderPhoto("사진"), alt: "검정 흰색 고양이" }],
  },
];

/** 공개 상태인 제보만 반환. 숨김·삭제·없는 ID 를 모두 같은 결과로 다룸 */
export function findPublicReportMock(id: string): PublicReportDetail | null {
  const found = MOCK_REPORTS.find((report) => report.id === id);
  return found && found.status === "open" ? found : null;
}

export function listPublicReportMocks(): PublicReportDetail[] {
  return MOCK_REPORTS.filter((report) => report.status === "open");
}

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "long",
  timeStyle: "short",
});

/** 목격 시각은 상대 표현 없이 KST 절대시각으로 보임 */
export function formatSightedAt(iso: string) {
  return KST.format(new Date(iso));
}
