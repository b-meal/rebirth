import "server-only";

import type {
  MatchAlertItem,
  NotificationArea,
  NotificationItem,
} from "@/components/mine/notification-list";

// 알림함이 찼을 때의 화면을 눈으로 보려고 두는 가짜 데이터
// 구독한 동네가 있어야 목록이 차는데 개발 중에는 비어 있는 일이 잦아 화면을 볼 길이 없음
//
// 운영에서는 어떤 경우에도 그려지지 않음
// NODE_ENV 가 production 이면 빈 값을 돌려주고, 개발에서도 preview=1 을 붙여야 나옴
// 제출 자료에 진짜 기록으로 섞이면 안 되므로 동네와 지역 이름에 예시 라고 박아 둠

/** 사진 자리를 채우는 회색 사각형. 바깥 요청 없이 그려져 CSP 와 무관함 */
const SAMPLE_PHOTO =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2780%27%20height%3D%2780%27%3E%3Crect%20width%3D%2780%27%20height%3D%2780%27%20fill%3D%27%23d9d9d9%27%2F%3E%3C%2Fsvg%3E";

/** 주소에 이 값이 있을 때만 가짜 데이터를 씀 */
export function wantsPreview(value: string | string[] | undefined): boolean {
  // 운영 빌드에서는 주소에 무엇이 오든 쓰지 않음
  if (process.env.NODE_ENV === "production") return false;
  return (Array.isArray(value) ? value[0] : value) === "1";
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

export const previewAreas: NotificationArea[] = [
  { areaCode: "preview-1", areaName: "예시동", unread: 3 },
  { areaCode: "preview-2", areaName: "예시2동", unread: 0 },
];

export const previewItems: NotificationItem[] = [
  {
    id: "preview-item-1",
    animalType: "dog",
    colors: ["흰색"],
    size: "small",
    careSituation: "roaming",
    injury: false,
    areaName: "예시동",
    createdAt: minutesAgo(12),
    photoUrl: SAMPLE_PHOTO,
    unread: true,
  },
  {
    id: "preview-item-2",
    animalType: "cat",
    colors: ["갈색", "검정"],
    size: "small",
    careSituation: "in_care",
    injury: false,
    areaName: "예시동",
    createdAt: minutesAgo(95),
    photoUrl: SAMPLE_PHOTO,
    unread: true,
  },
  {
    id: "preview-item-3",
    animalType: "dog",
    colors: ["갈색"],
    size: "medium",
    careSituation: "roaming",
    injury: true,
    areaName: "예시2동",
    createdAt: minutesAgo(260),
    // 사진 없는 제보도 섞어 자리만 잡힌 줄을 함께 봄
    photoUrl: null,
    unread: true,
  },
  {
    id: "preview-item-4",
    animalType: "other",
    colors: ["회색"],
    size: "small",
    careSituation: "unknown",
    injury: null,
    areaName: "예시2동",
    createdAt: minutesAgo(1_500),
    photoUrl: SAMPLE_PHOTO,
    unread: false,
  },
  {
    id: "preview-item-5",
    animalType: "cat",
    colors: ["흰색", "갈색"],
    size: "small",
    careSituation: "roaming",
    injury: false,
    areaName: "예시동",
    createdAt: minutesAgo(3_000),
    photoUrl: SAMPLE_PHOTO,
    unread: false,
  },
];

export const previewMatches: MatchAlertItem[] = [
  {
    id: "preview-match-1",
    animalType: "dog",
    colors: ["흰색"],
    size: "small",
    careSituation: "in_care",
    injury: false,
    areaName: "예시동",
    createdAt: minutesAgo(40),
    photoUrl: SAMPLE_PHOTO,
    unread: true,
    score: 72,
    lostId: "preview-lost-1",
    lostName: "예시",
  },
];
