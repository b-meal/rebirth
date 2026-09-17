import type { MatchInput } from "./score";

// 점수 계산에 넣을 값으로 옮기는 자리
// 후보 모집과 알림, 역방향 비교가 같은 변환을 쓰므로 한 곳에 둠

export type ScorableRow = {
  animalType: MatchInput["animalType"];
  colors: string[];
  size: MatchInput["size"];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  coarsePoint: { x: number; y: number } | null;
  occurredAt: Date;
};

export function toMatchInput(row: ScorableRow): MatchInput {
  return {
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    collar: row.collar,
    injury: row.injury,
    earTip: row.earTip,
    // 격자 좌표로만 계산함. 정확 좌표는 읽지 않음
    point: row.coarsePoint ? { lat: row.coarsePoint.y, lng: row.coarsePoint.x } : null,
    occurredAt: row.occurredAt,
  };
}
