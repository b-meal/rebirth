// 공식 기관 연락처. 출처와 최종 확인일을 함께 두어 화면에 근거를 밝힘
// 검증하지 않은 기관 번호는 넣지 않음

export type OfficialContact = {
  name: string;
  description: string;
  tel?: string;
  href?: string;
  // 운영 시간을 단정하지 않고 확인된 표현만 씀
  note: string;
};

export const CONTACT_SOURCE = {
  label: "농림축산식품부 발견 신고 안내",
  checkedOn: "2026-03-17",
} as const;

export const OFFICIAL_CONTACTS: OfficialContact[] = [
  {
    name: "국가동물보호정보시스템",
    description: "발견 신고를 온라인으로 접수합니다",
    href: "https://www.animal.go.kr",
    note: "온라인 상시 접수",
  },
  {
    name: "동물보호 상담센터",
    description: "전화로 발견 신고와 안내를 받을 수 있습니다",
    tel: "1577-0954",
    note: "운영 시간은 기관 안내를 확인해 주세요",
  },
];

// 접근·포획·투약 방법은 안내하지 않음. 안전과 공식 경로만 다룸
export const SAFETY_NOTES = [
  "차도 근처이거나 사람이 위험할 수 있는 상황이면 먼저 119에 알려 주세요.",
  "새끼로 보이는 동물은 어미가 가까이 있을 수 있어 데려가기 전에 확인이 필요해요.",
  "고양이 귀 끝이 잘려 있으면 중성화한 길고양이일 수 있어요. 다만 겉모습만으로 단정할 수는 없어요.",
];

export const LEGAL_SOURCES = [
  { name: "개인정보 보호법", href: "https://www.law.go.kr/법령/개인정보보호법" },
  {
    name: "위치정보의 보호 및 이용 등에 관한 법률",
    href: "https://www.law.go.kr/법령/위치정보의보호및이용등에관한법률",
  },
];
