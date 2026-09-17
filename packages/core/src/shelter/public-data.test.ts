import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractRows,
  extractTotalCount,
  normalizeCareCenter,
  normalizeTime,
  normalizeWildlifeCenter,
  readResultCode,
} from "./public-data.ts";

test("시각은 자리수가 달라도 HH:MM 으로 맞춰진다", () => {
  assert.equal(normalizeTime("0900"), "09:00");
  assert.equal(normalizeTime("09:00"), "09:00");
  assert.equal(normalizeTime("930"), "09:30");
  assert.equal(normalizeTime("9"), "09:00");
  assert.equal(normalizeTime("18"), "18:00");
  assert.equal(normalizeTime(null), null);
  assert.equal(normalizeTime("없음"), null);
  assert.equal(normalizeTime("9999"), null);
});

test("동물보호센터 행이 정규화된다", () => {
  const row = normalizeCareCenter({
    careNm: "서울시 동물보호센터",
    careRegNo: "311301201700001",
    orgNm: "서울특별시 마포구",
    saveTrgtAnimal: "개,고양이",
    careAddr: "서울특별시 마포구 상암동 1-1",
    lat: "37.5665",
    lng: "126.9780",
    careTel: "02-123-4567",
    weekOprStime: "0900",
    weekOprEtime: "1800",
    closeDay: "일요일",
    vetPersonCnt: "2명",
    dataStdDt: "2026-08-31",
  });

  assert.ok(row);
  assert.equal(row.kind, "care_center");
  assert.equal(row.externalId, "311301201700001");
  assert.deepEqual(row.point, { lat: 37.5665, lng: 126.978 });
  assert.equal(row.weekdayOpen, "09:00");
  assert.equal(row.weekdayClose, "18:00");
  assert.equal(row.vetCount, 2);
  assert.equal(row.weekendOpen, null);
});

test("등록번호가 없으면 이름과 주소로 키를 만든다", () => {
  const row = normalizeCareCenter({
    careNm: "가나 보호소",
    careAddr: "경기도 수원시 1",
  });
  assert.equal(row?.externalId, "가나보호소|경기도수원시1");
});

test("이름이 없는 행은 버린다", () => {
  assert.equal(normalizeCareCenter({ careAddr: "서울" }), null);
  assert.equal(normalizeWildlifeCenter({ rdnmadr: "서울" }), null);
});

test("빈 값 표기는 null 로 떨어진다", () => {
  const row = normalizeCareCenter({
    careNm: "테스트 센터",
    careTel: "-",
    closeDay: "해당없음",
    jibunAddr: "   ",
  });
  assert.equal(row?.tel, null);
  assert.equal(row?.closedDay, null);
  assert.equal(row?.lotAddress, null);
});

test("위경도가 뒤집혀 들어와도 바로잡는다", () => {
  const row = normalizeCareCenter({
    careNm: "뒤집힌 센터",
    lat: "126.978",
    lng: "37.5665",
  });
  assert.deepEqual(row?.point, { lat: 37.5665, lng: 126.978 });
});

test("국내 범위 밖 좌표는 버린다", () => {
  const row = normalizeCareCenter({
    careNm: "좌표 없는 센터",
    lat: "0",
    lng: "0",
  });
  assert.equal(row?.point, null);
});

test("야생동물구조센터 행이 정규화된다", () => {
  const row = normalizeWildlifeCenter({
    wlresCnterNm: "충남야생동물구조센터",
    insttNm: "충청남도",
    rdnmadr: "충청남도 예산군 대학로 54",
    latitude: "36.6789",
    longitude: "126.8512",
    phoneNumber: "041-000-0000",
    operOpenHhmm: "09:00",
    operColseHhmm: "18:00",
    rstdeInfo: "토요일,일요일",
    veterinarianCo: "3",
    referenceDate: "2026-07-01",
  });

  assert.ok(row);
  assert.equal(row.kind, "wildlife_center");
  assert.equal(row.targetAnimals, "야생동물");
  assert.equal(row.tel, "041-000-0000");
  assert.equal(row.vetCount, 3);
  assert.equal(row.externalId, "충남야생동물구조센터|충청남도예산군대학로54");
});

test("items 가 어떤 모양으로 와도 배열로 꺼낸다", () => {
  assert.equal(extractRows({ response: { body: { items: [{ a: 1 }] } } }).length, 1);
  assert.equal(
    extractRows({ response: { body: { items: { item: [{ a: 1 }, { a: 2 }] } } } })
      .length,
    2,
  );
  assert.equal(
    extractRows({ response: { body: { items: { item: { a: 1 } } } } }).length,
    1,
  );
  assert.deepEqual(extractRows({ response: { body: {} } }), []);
  assert.deepEqual(extractRows(null), []);
});

test("전체 건수와 결과 코드를 읽는다", () => {
  assert.equal(extractTotalCount({ response: { body: { totalCount: "417" } } }), 417);
  assert.equal(extractTotalCount({}), 0);
  assert.equal(readResultCode({ response: { header: { resultCode: "00" } } }), "00");
  assert.equal(readResultCode({}), null);
});

test("휴무일 없음 표기는 비워 둔다", () => {
  const row = normalizeCareCenter({ careNm: "무휴 센터", closeDay: "0" });
  assert.equal(row?.closedDay, null);
  assert.equal(normalizeCareCenter({ careNm: "숫자", closeDay: "2" })?.closedDay, null);
  assert.equal(
    normalizeCareCenter({ careNm: "무휴 센터", closeDay: "연중무휴" })?.closedDay,
    null,
  );
  assert.equal(
    normalizeCareCenter({ careNm: "일요 휴무", closeDay: "일요일" })?.closedDay,
    "일요일",
  );
});

test("실제 응답 한 건이 그대로 정규화된다", () => {
  const row = normalizeCareCenter({
    careNm: "(사)대구수의사회",
    careRegNo: "327346201500001",
    orgNm: "대구광역시 수성구",
    divisionNm: "법인",
    saveTrgtAnimal: "개+고양이+기타",
    careAddr: "대구광역시 북구 호국로 229 (서변동) 6층",
    jibunAddr: " 6층",
    lat: 35.922276,
    lng: 128.59904,
    weekOprStime: "00:00",
    weekOprEtime: "24:00",
    closeDay: "0",
    vetPersonCnt: 0,
    specsPersonCnt: 0,
    careTel: "053-764-3708",
    dataStdDt: "2025-01-03",
  });

  assert.equal(row?.externalId, "327346201500001");
  assert.equal(row?.targetAnimals, "개+고양이+기타");
  assert.deepEqual(row?.point, { lat: 35.922276, lng: 128.59904 });
  assert.equal(row?.weekdayOpen, "00:00");
  assert.equal(row?.weekdayClose, "24:00");
  assert.equal(row?.closedDay, null);
  assert.equal(row?.vetCount, 0);
  assert.equal(row?.tel, "053-764-3708");
});

test("response 래퍼가 없는 응답도 읽는다", () => {
  const payload = {
    header: { resultCode: "00" },
    body: { items: { item: [{ a: 1 }] }, totalCount: 58 },
  };
  assert.equal(extractRows(payload).length, 1);
  assert.equal(extractTotalCount(payload), 58);
  assert.equal(readResultCode(payload), "00");
});

test("실제 야생동물구조센터 응답이 그대로 정규화된다", () => {
  const row = normalizeWildlifeCenter({
    wlresCnterNm: "유일동물병원",
    rdnmadr: "경기도 양평군 양평읍 미리내길 96",
    lnmadr: "경기도 양평군 양평읍 도곡리 286-1",
    latitude: "37.481074",
    longitude: "127.534913",
    operOpenHhmm: "06:00",
    operColseHhmm: "20:00",
    rstde: "연중무휴",
    vtrinrnCo: "1",
    dissRsrchrCo: "1",
    rprsntvNm: "류지원",
    phoneNumber: "031-772-2727",
    referenceDate: "2025-12-17",
    insttNm: "경기도 양평군",
  });

  assert.equal(row?.kind, "wildlife_center");
  assert.equal(row?.orgName, "경기도 양평군");
  assert.equal(row?.weekdayOpen, "06:00");
  assert.equal(row?.weekdayClose, "20:00");
  assert.equal(row?.closedDay, null);
  assert.equal(row?.vetCount, 1);
  assert.equal(row?.keeperCount, 1);
  assert.equal(row?.tel, "031-772-2727");
  assert.deepEqual(row?.point, { lat: 37.481074, lng: 127.534913 });
});

test("별표로 가린 전화번호는 비워 둔다", () => {
  assert.equal(
    normalizeCareCenter({ careNm: "가린 센터", careTel: "***********" })?.tel,
    null,
  );
  assert.equal(
    normalizeCareCenter({ careNm: "정상", careTel: "064-710-4065" })?.tel,
    "064-710-4065",
  );
  assert.equal(
    normalizeWildlifeCenter({ wlresCnterNm: "가린 센터", phoneNumber: "**-***-****" })
      ?.tel,
    null,
  );
});
