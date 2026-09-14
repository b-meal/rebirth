import assert from "node:assert/strict";
import test from "node:test";

import { appDirectionsUrl, webDirectionsUrl } from "./map-link.ts";

const TO = { lat: 37.5665, lng: 126.978, name: "회현동, 발견 위치" };

test("웹 주소는 출발지를 비워 현재 위치에서 출발한다", () => {
  // 네이버는 출발지 자리의 - 가 현재 위치를 뜻함
  const naver = webDirectionsUrl("naver", TO);
  assert.match(naver, /^https:\/\/map\.naver\.com\/p\/directions\/-\//);
  assert.ok(naver.endsWith("/-/walk"));

  // 카카오 link/to 는 도착지만 받고 출발지를 앱이 정함
  assert.ok(webDirectionsUrl("kakao", TO).startsWith("https://map.kakao.com/link/to/"));
});

test("앱 스킴에 출발지 좌표를 넣지 않는다", () => {
  const naver = appDirectionsUrl("naver", TO, "example.com");
  assert.ok(!naver.includes("slat="));
  assert.ok(!naver.includes("slng="));
  // appname 이 없으면 네이버 지도가 열리지 않음
  assert.ok(naver.includes("appname=example.com"));

  const kakao = appDirectionsUrl("kakao", TO, "example.com");
  assert.ok(!kakao.includes("sp="));
  assert.ok(kakao.includes(`ep=${TO.lat},${TO.lng}`));
});

test("이름에 쉼표가 있어도 좌표 자리를 밀어내지 않는다", () => {
  // 카카오 웹 주소는 이름과 좌표를 쉼표로 잇기 때문에 이름의 쉼표가 살아 있으면 어긋남
  const kakao = webDirectionsUrl("kakao", TO);
  const tail = kakao.slice("https://map.kakao.com/link/to/".length);
  assert.equal(tail.split(",").length, 3);
  assert.ok(tail.endsWith(`,${TO.lat},${TO.lng}`));
});
