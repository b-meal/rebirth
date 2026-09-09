import type { LatLng } from "./geo";

// 장소 검색과 주소 검색의 공통 결과 형태. 클라이언트가 server-only 모듈을 참조하지 않게 분리

export type LocationCandidate = {
  id: string;
  // 장소명 또는 주소 문자열
  name: string;
  // 도로명 주소 등 보조 설명
  detail: string;
  point: LatLng;
  areaName: string;
  distanceMeters: number | null;
  phone: string | null;
  placeUrl: string | null;
  category: string | null;
};
