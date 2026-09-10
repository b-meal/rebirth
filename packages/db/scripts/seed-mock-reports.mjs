// 데모용 발견 제보 20건과 사진을 넣는 스크립트, 고정 UUID 라 다시 실행해도 늘지 않음

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// loadEnvFile 은 셸에 이미 있는 값을 덮지 않아 다른 프로젝트 키가 섞임, 파일을 원천으로 둠
function readEnvFile(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
  return env;
}

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAKAO_REST_API_KEY } =
  readEnvFile(path.join(repoRoot, ".env.local"));
if (!DATABASE_URL) throw new Error("DATABASE_URL 이 없습니다");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다");
}

const PHOTO_BUCKET = "report-photos";
const ID_PREFIX = "00000000-0000-4000-8000-0000";

// packages/core/src/location/geo.ts 의 격자 스냅과 같은 계산, 목데이터 전용 사본
const METERS_PER_LAT_DEGREE = 111_320;
const RAD = Math.PI / 180;
const round7 = (v) => Math.round(v * 1e7) / 1e7;
const snapAxis = (value, step) => round7((Math.floor(value / step) + 0.5) * step);

function snapToGrid({ lat, lng }, meters) {
  const latStep = meters / METERS_PER_LAT_DEGREE;
  const snappedLat = snapAxis(lat, latStep);
  const lngStep = latStep / Math.max(Math.cos(snappedLat * RAD), 0.01);
  return { lat: snappedLat, lng: snapAxis(lng, lngStep) };
}

// 데모 기준점, 과천대로7길 33 주변으로 흩음
const BASE = { lat: 37.41380, lng: 126.97717 };

// 기준점에서 동서남북으로 떨어진 거리를 미터로 두고 좌표는 계산해서 씀
function offsetPoint({ dx, dy }) {
  const lat = BASE.lat + dy / METERS_PER_LAT_DEGREE;
  const lng = BASE.lng + dx / (METERS_PER_LAT_DEGREE * Math.cos(lat * RAD));
  return { lat, lng };
}

const SPOTS = [
  {
    dx: -120, dy: 180, breed: "maltese",
    colors: ["흰색"], size: "small", care: "roaming", collar: false, injury: false,
    appearance: "흰색 소형견, 말티즈 계열로 보입니다. 사람이 다가가도 피하지 않았습니다",
    landmark: "과천대로7길 상가 앞 화단",
    tags: ["목줄 없음"],
  },
  {
    dx: 260, dy: -140, breed: "shihtzu",
    colors: ["갈색", "흰색"], size: "small", care: "in_care", collar: true, injury: false,
    appearance: "갈색과 흰색이 섞인 소형견입니다. 목줄을 하고 있어 집을 나온 것으로 보입니다",
    landmark: "갈현동 먹거리촌 골목 끝",
    tags: [],
  },
  {
    dx: -380, dy: 420, breed: "pomeranian",
    colors: ["갈색"], size: "small", care: "roaming", collar: false, injury: false,
    appearance: "밝은 갈색 털의 소형견입니다. 꼬리털이 풍성합니다",
    landmark: "정부과천청사역 3번 출구 옆",
    tags: ["겁이 많음"],
  },
  {
    dx: 620, dy: 260, breed: "beagle",
    colors: ["갈색", "흰색"], size: "medium", care: "roaming", collar: false, injury: true,
    appearance: "귀가 길게 늘어진 중형견입니다. 뒷다리를 절고 있었습니다",
    landmark: "별양동 주공아파트 놀이터",
    tags: ["다리를 절음"],
  },
  {
    dx: -540, dy: -260, breed: "chihuahua",
    colors: ["검정색"], size: "small", care: "in_care", collar: false, injury: false,
    appearance: "검정색 단모 소형견입니다. 몸이 많이 말랐습니다",
    landmark: "문원동 주민센터 뒤 주차장",
    tags: ["마른 상태"],
  },
  {
    dx: 180, dy: 640, breed: "poodle/toy",
    colors: ["검정색"], size: "small", care: "roaming", collar: true, injury: false,
    appearance: "곱슬 털의 검정 소형견입니다. 빨간 목줄을 하고 있습니다",
    landmark: "과천시청 앞 버스 정류장",
    tags: [],
  },
  {
    dx: -760, dy: 120, breed: "spitz/japanese",
    colors: ["흰색"], size: "small", care: "roaming", collar: false, injury: false,
    appearance: "흰색 장모 소형견입니다. 귀가 뾰족하게 서 있습니다",
    landmark: "관문동 우체국 앞 보도",
    tags: ["목줄 없음"],
  },
  {
    dx: 420, dy: -520, breed: "dachshund",
    colors: ["갈색"], size: "small", care: "in_care", collar: false, injury: false,
    appearance: "다리가 짧고 몸이 긴 갈색 소형견입니다",
    landmark: "과천향교 담장 옆",
    tags: [],
  },
  {
    dx: 860, dy: 480, breed: "retriever/golden",
    colors: ["황색"], size: "large", care: "roaming", collar: true, injury: false,
    appearance: "황색 장모 대형견입니다. 끊어진 목줄이 매여 있습니다",
    landmark: "서울대공원역 2번 출구 계단",
    tags: ["목줄 끊어짐"],
  },
  {
    dx: -200, dy: -640, breed: "corgi/cardigan",
    colors: ["갈색", "흰색"], size: "medium", care: "roaming", collar: false, injury: false,
    appearance: "다리가 짧고 귀가 큰 중형견입니다. 엉덩이 쪽 털이 흰색입니다",
    landmark: "양재천 산책로 벤치 근처",
    tags: [],
  },
  {
    dx: 700, dy: -320, breed: "mix",
    colors: ["검정색", "갈색"], size: "medium", care: "roaming", collar: false, injury: false,
    appearance: "검정과 갈색이 섞인 중형견입니다. 사람을 경계했습니다",
    landmark: "과천중앙공원 농구장 뒤",
    tags: ["겁이 많음", "목줄 없음"],
  },
  {
    dx: -880, dy: -420, breed: "pug",
    colors: ["황색"], size: "small", care: "in_care", collar: true, injury: false,
    appearance: "코가 짧고 주름이 있는 소형견입니다. 숨소리가 거칠었습니다",
    landmark: "부림동 도서관 앞 자전거 보관대",
    tags: ["호흡이 거침"],
  },
  {
    dx: 1040, dy: 160, breed: "husky",
    colors: ["회색", "흰색"], size: "large", care: "roaming", collar: false, injury: false,
    appearance: "회색과 흰색이 섞인 대형견입니다. 눈이 밝은 색입니다",
    landmark: "렛츠런파크 서울 주차장 입구",
    tags: ["목줄 없음"],
  },
  {
    dx: -320, dy: 880, breed: "maltese",
    colors: ["흰색"], size: "small", care: "roaming", collar: false, injury: true,
    appearance: "흰색 소형견입니다. 오른쪽 눈 주변에 상처가 있습니다",
    landmark: "관악산 등산로 입구 안내판",
    tags: ["눈 주변 상처"],
  },
  {
    dx: 540, dy: 760, breed: "beagle",
    colors: ["갈색", "흰색"], size: "medium", care: "roaming", collar: true, injury: false,
    appearance: "귀가 늘어진 중형견입니다. 파란 목줄을 하고 있습니다",
    landmark: "원문동 아파트 상가 뒤편",
    tags: [],
  },
  {
    dx: -640, dy: 540, breed: "shihtzu",
    colors: ["흰색", "갈색"], size: "small", care: "in_care", collar: false, injury: false,
    appearance: "털이 길게 자란 소형견입니다. 털이 많이 엉켜 있습니다",
    landmark: "과천역 1번 출구 앞 화단",
    tags: ["털 엉킴"],
  },
  {
    dx: 960, dy: -560, breed: "pomeranian",
    colors: ["흰색"], size: "small", care: "roaming", collar: false, injury: false,
    appearance: "흰색 소형견입니다. 계속 같은 자리를 돌고 있었습니다",
    landmark: "뒷벌초등학교 후문 담장",
    tags: ["같은 자리 배회"],
  },
  {
    dx: -1080, dy: 260, breed: "chihuahua",
    colors: ["갈색"], size: "small", care: "roaming", collar: true, injury: false,
    appearance: "갈색 단모 소형견입니다. 목줄에 인식표는 없었습니다",
    landmark: "갈현동 주민센터 옆 골목",
    tags: [],
  },
  {
    dx: 300, dy: -880, breed: "poodle/toy",
    colors: ["황색"], size: "small", care: "roaming", collar: false, injury: false,
    appearance: "황색 곱슬 털 소형견입니다. 발바닥이 더러워진 상태였습니다",
    landmark: "과천도서관 앞 벤치",
    tags: ["목줄 없음"],
  },
  {
    dx: -460, dy: -880, breed: "retriever/golden",
    colors: ["황색"], size: "large", care: "in_care", collar: true, injury: false,
    appearance: "황색 대형견입니다. 사람 말에 잘 따랐습니다",
    landmark: "중앙동 어린이공원 미끄럼틀 옆",
    tags: [],
  },
];

// 부상 제보는 격자를 넓혀 특정 가능성을 낮추는 coarseGridMetersFor 와 같은 기준
const gridFor = (spot) => (spot.injury ? 1000 : 300);

async function fetchDogPhoto(breed) {
  const list = await fetch(`https://dog.ceo/api/breed/${breed}/images/random`);
  const body = await list.json();
  const image = await fetch(body.message);
  if (!image.ok) throw new Error(`사진을 받지 못했습니다: ${body.message}`);
  return new Uint8Array(await image.arrayBuffer());
}

async function uploadPhoto(objectPath, body) {
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${PHOTO_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "image/jpeg",
        "x-upsert": "true",
      },
      body,
    },
  );
  if (!response.ok) {
    throw new Error(`업로드 실패 ${response.status} ${(await response.text()).slice(0, 120)}`);
  }
}

// 좌표에 맞는 행정동을 받아 지역명이 실제 위치와 어긋나지 않게 함
async function resolveArea({ lat, lng }) {
  if (!KAKAO_REST_API_KEY) return null;
  const query = new URLSearchParams({ x: String(lng), y: String(lat) });
  const response = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?${query}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } },
  );
  if (!response.ok) return null;
  const body = await response.json();
  const region = body.documents?.find((d) => d.region_type === "H") ?? body.documents?.[0];
  if (!region) return null;
  return {
    code: region.code,
    name: [region.region_1depth_name, region.region_2depth_name, region.region_3depth_name]
      .filter(Boolean)
      .join(" "),
  };
}

const sql = postgres(DATABASE_URL, { prepare: false });

try {
  const now = Date.now();
  let done = 0;

  for (const [index, spot] of SPOTS.entries()) {
    const id = `${ID_PREFIX}${String(index + 1).padStart(8, "0")}`;
    const grid = gridFor(spot);
    const point = offsetPoint(spot);
    const coarse = snapToGrid(point, grid);
    const area = await resolveArea(point);
    // 최근 12일에 흩어 두어 목록 정렬이 한 시각에 몰리지 않게 함
    const occurredAt = new Date(now - (index * 14 + 3) * 3_600_000);

    await sql`
      insert into reports (
        id, kind, visibility, lifecycle, care_situation, animal_type, appearance,
        colors, size, sex, neutered, condition_tags, collar, injury,
        coarse_point, coarse_grid_m, location_source,
        area_code_system, area_code, area_name, landmark_note, occurred_at
      ) values (
        ${id}, 'sighting', 'public', 'active', ${spot.care}, 'dog', ${spot.appearance},
        ${spot.colors}, ${spot.size}, 'unknown', 'unknown', ${spot.tags},
        ${spot.collar}, ${spot.injury},
        ST_SetSRID(ST_MakePoint(${coarse.lng}, ${coarse.lat}), 4326), ${grid}, 'gps',
        ${area ? "H" : null}, ${area?.code ?? null}, ${area?.name ?? null},
        ${spot.landmark}, ${occurredAt}
      )
      on conflict (id) do update set
        care_situation = excluded.care_situation,
        appearance = excluded.appearance,
        colors = excluded.colors,
        size = excluded.size,
        condition_tags = excluded.condition_tags,
        collar = excluded.collar,
        injury = excluded.injury,
        coarse_point = excluded.coarse_point,
        coarse_grid_m = excluded.coarse_grid_m,
        area_code_system = excluded.area_code_system,
        area_code = excluded.area_code,
        area_name = excluded.area_name,
        landmark_note = excluded.landmark_note,
        occurred_at = excluded.occurred_at
    `;

    const objectPath = `${id}/0.jpg`;
    await uploadPhoto(objectPath, await fetchDogPhoto(spot.breed));
    await sql`delete from report_photos where report_id = ${id}`;
    await sql`
      insert into report_photos (report_id, storage_path, sort_order)
      values (${id}, ${objectPath}, 0)
    `;

    done += 1;
    process.stdout.write(`${done}/${SPOTS.length} ${area?.name ?? "지역 미확인"}\n`);
  }

  process.stdout.write(`\n발견 제보 ${done}건과 사진 ${done}장을 넣었습니다\n`);
  process.stdout.write(`지우려면 delete from reports where id::text like '${ID_PREFIX}%'\n`);
} finally {
  await sql.end();
}
