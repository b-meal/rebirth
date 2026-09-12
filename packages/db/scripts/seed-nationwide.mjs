// 전국 60개 지점에 발견 제보 300건을 넣는 스크립트, 고정 UUID 라 다시 실행해도 늘지 않음

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
// 과천 데모 20건의 00000000-0000-4000-8000-0000 대역과 겹치지 않는 구간
const ID_PREFIX = "00000000-0000-4000-8000-1000";
const CONCURRENCY = 6;

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

// 홈 화면 NEARBY_RADIUS_KM 3km 안에 다섯 건이 고르게 들어오게 한 등차 반경
const RINGS = [400, 1000, 1600, 2200, 2800];

// 반경이 커질수록 기준점에서 먼 표현을 써서 지형물 메모가 좌표와 어긋나지 않게 함
const RING_SUFFIX = [
  "앞 화단",
  "인근 상가 골목",
  "인근 어린이공원",
  "방면 하천 산책로",
  "방면 아파트 단지 입구",
];

// 전국 17개 시도를 인구 규모에 맞춰 나눈 기준점, 좌표는 각 지역 도심
const ANCHORS = [
  { name: "강남역", lat: 37.4979, lng: 127.0276 },
  { name: "홍대입구역", lat: 37.5568, lng: 126.9237 },
  { name: "잠실역", lat: 37.5133, lng: 127.1001 },
  { name: "노원역", lat: 37.6554, lng: 127.0616 },
  { name: "목동역", lat: 37.5262, lng: 126.8756 },
  { name: "성수역", lat: 37.5446, lng: 127.0559 },
  { name: "신촌역", lat: 37.5551, lng: 126.9368 },
  { name: "왕십리역", lat: 37.5612, lng: 127.0374 },
  { name: "수원 영통", lat: 37.2519, lng: 127.0714 },
  { name: "성남 서현", lat: 37.3855, lng: 127.1234 },
  { name: "고양 정발산", lat: 37.6583, lng: 126.7746 },
  { name: "용인 기흥", lat: 37.2751, lng: 127.1157 },
  { name: "부천 중동", lat: 37.5035, lng: 126.766 },
  { name: "안양 평촌", lat: 37.3925, lng: 126.9568 },
  { name: "화성 동탄", lat: 37.2006, lng: 127.0731 },
  { name: "남양주 다산", lat: 37.6117, lng: 127.16 },
  { name: "평택역", lat: 37.0786, lng: 127.045 },
  { name: "의정부역", lat: 37.7382, lng: 127.0338 },
  { name: "인천 송도", lat: 37.3894, lng: 126.639 },
  { name: "인천 부평", lat: 37.5074, lng: 126.7218 },
  { name: "인천 계양", lat: 37.5372, lng: 126.7379 },
  { name: "부산 서면", lat: 35.1578, lng: 129.0594 },
  { name: "부산 해운대", lat: 35.1631, lng: 129.1635 },
  { name: "부산 사상", lat: 35.1478, lng: 128.991 },
  { name: "부산 동래", lat: 35.2049, lng: 129.0784 },
  { name: "대구 동성로", lat: 35.8693, lng: 128.5947 },
  { name: "대구 수성", lat: 35.858, lng: 128.63 },
  { name: "대구 칠곡", lat: 35.943, lng: 128.552 },
  { name: "광주 상무", lat: 35.152, lng: 126.85 },
  { name: "광주 첨단", lat: 35.226, lng: 126.845 },
  { name: "대전 둔산", lat: 36.3515, lng: 127.385 },
  { name: "대전 유성", lat: 36.362, lng: 127.356 },
  { name: "울산 삼산", lat: 35.5384, lng: 129.339 },
  { name: "울산 무거", lat: 35.554, lng: 129.26 },
  { name: "세종 도담", lat: 36.48, lng: 127.289 },
  { name: "춘천역", lat: 37.8813, lng: 127.73 },
  { name: "강릉역", lat: 37.7519, lng: 128.8761 },
  { name: "원주역", lat: 37.3422, lng: 127.9202 },
  { name: "속초 중앙", lat: 38.207, lng: 128.5918 },
  { name: "청주 성안", lat: 36.6424, lng: 127.489 },
  { name: "충주 성서", lat: 36.991, lng: 127.926 },
  { name: "천안역", lat: 36.8151, lng: 127.1139 },
  { name: "아산 온양", lat: 36.79, lng: 127.002 },
  { name: "서산 동문", lat: 36.7848, lng: 126.4503 },
  { name: "전주 한옥마을", lat: 35.8242, lng: 127.148 },
  { name: "익산역", lat: 35.9483, lng: 126.9576 },
  { name: "군산 나운", lat: 35.9676, lng: 126.737 },
  { name: "여수 여서", lat: 34.7604, lng: 127.6622 },
  { name: "순천 조례", lat: 34.9506, lng: 127.4872 },
  { name: "목포 하당", lat: 34.8118, lng: 126.3922 },
  { name: "포항 죽도", lat: 36.019, lng: 129.3435 },
  { name: "경주 황리단길", lat: 35.8562, lng: 129.2247 },
  { name: "안동 옥동", lat: 36.5684, lng: 128.7294 },
  { name: "구미 원평", lat: 36.1196, lng: 128.3441 },
  { name: "창원 상남", lat: 35.2281, lng: 128.6811 },
  { name: "김해 내외", lat: 35.2342, lng: 128.8894 },
  { name: "진주 신안", lat: 35.18, lng: 128.1076 },
  { name: "거제 고현", lat: 34.8806, lng: 128.6211 },
  { name: "제주 노형", lat: 33.4996, lng: 126.5312 },
  { name: "서귀포 중앙", lat: 33.2541, lng: 126.5601 },
];

// 개 50 고양이 40 기타 10 비율, 앵커마다 다섯 건씩 잘려 구성이 지점별로 달라짐
const TYPE_CYCLE = [
  "dog", "cat", "dog", "cat", "dog", "dog", "cat", "dog", "cat", "other",
  "dog", "cat", "dog", "cat", "dog", "cat", "dog", "other", "dog", "cat",
];

// dog.ceo 품종 키와 화면 표기, label 이 null 이면 품종을 적지 않고 사진만 씀
const DOGS = [
  { photo: "maltese", label: "말티즈", size: "small", colors: ["흰색"] },
  { photo: "shihtzu", label: "시추", size: "small", colors: ["갈색", "흰색"] },
  { photo: "pomeranian", label: "포메라니안", size: "small", colors: ["갈색"] },
  { photo: "poodle/toy", label: "푸들", size: "small", colors: ["황색"] },
  { photo: "chihuahua", label: "치와와", size: "small", colors: ["갈색"] },
  { photo: "dachshund", label: "닥스훈트", size: "small", colors: ["갈색"] },
  { photo: "terrier/yorkshire", label: "요크셔테리어", size: "small", colors: ["회색", "갈색"] },
  { photo: "spitz/japanese", label: "스피츠", size: "small", colors: ["흰색"] },
  { photo: "pug", label: "퍼그", size: "small", colors: ["황색"] },
  { photo: "papillon", label: "파피용", size: "small", colors: ["흰색", "갈색"] },
  { photo: "beagle", label: "비글", size: "medium", colors: ["갈색", "흰색"] },
  { photo: "corgi/cardigan", label: "웰시 코기", size: "medium", colors: ["갈색", "흰색"] },
  { photo: "shiba", label: "시바", size: "medium", colors: ["황색"] },
  { photo: "schnauzer/miniature", label: "슈나우저", size: "medium", colors: ["회색"] },
  { photo: "bulldog/french", label: "프렌치 불도그", size: "medium", colors: ["검정색"] },
  { photo: "sheepdog/shetland", label: null, size: "medium", colors: ["갈색", "흰색"] },
  { photo: "retriever/golden", label: "골든 리트리버", size: "large", colors: ["황색"] },
  { photo: "labrador", label: "래브라도 리트리버", size: "large", colors: ["검정색"] },
  { photo: "husky", label: "허스키", size: "large", colors: ["회색", "흰색"] },
  { photo: "samoyed", label: "사모예드", size: "large", colors: ["흰색"] },
  { photo: "akita", label: null, size: "large", colors: ["황색", "흰색"] },
  { photo: "malinois", label: null, size: "large", colors: ["갈색", "검정색"] },
];

// 고양이는 품종 대신 털 무늬로만 적어 오판 여지를 없앰
const CATS = [
  { label: "코리안 숏헤어", pattern: "고등어 무늬", colors: ["회색", "검정색"] },
  { label: "코리안 숏헤어", pattern: "치즈 무늬", colors: ["황색"] },
  { label: "코리안 숏헤어", pattern: "삼색", colors: ["흰색", "갈색", "검정색"] },
  { label: "코리안 숏헤어", pattern: "턱시도 무늬", colors: ["검정색", "흰색"] },
  { label: null, pattern: "전신 검정색", colors: ["검정색"] },
  { label: null, pattern: "전신 흰색", colors: ["흰색"] },
  { label: null, pattern: "젖소 무늬", colors: ["흰색", "검정색"] },
  { label: "러시안 블루 계열", pattern: "회색 단모", colors: ["회색"] },
  { label: "페르시안 계열", pattern: "장모", colors: ["흰색", "황색"] },
  { label: "샴 계열", pattern: "얼굴과 발 끝이 짙은 색", colors: ["갈색", "흰색"] },
];

// 개와 고양이가 아닌 제보, 공개 사진 원천이 없어 사진 없이 들어감
const OTHERS = [
  { label: "토끼", size: "small", colors: ["흰색"], note: "귀가 길고 앞니가 드러난 소동물입니다" },
  { label: "토끼", size: "small", colors: ["갈색"], note: "갈색 털의 소동물이 화단에 앉아 있었습니다" },
  { label: "고슴도치", size: "small", colors: ["갈색"], note: "등에 가시가 있는 소동물입니다" },
  { label: "기니피그", size: "small", colors: ["흰색", "갈색"], note: "꼬리가 없는 통통한 소동물입니다" },
  { label: "페럿", size: "small", colors: ["흰색", "갈색"], note: "몸이 길고 다리가 짧은 소동물입니다" },
  { label: "앵무새", size: "small", colors: ["흰색"], note: "사람 손에 앉으려 하는 중형 조류입니다" },
  { label: "거북", size: "small", colors: ["갈색"], note: "등껍질이 단단한 소동물이 보도를 기어가고 있었습니다" },
  { label: "닭", size: "medium", colors: ["흰색"], note: "주택가를 돌아다니는 가금류입니다" },
];

const DOG_TAGS = [
  [], ["목줄 없음"], ["겁이 많음"], ["마른 상태"], ["털 엉킴"],
  ["같은 자리 배회"], ["목줄 없음", "겁이 많음"], ["사람을 잘 따름"],
];
const CAT_TAGS = [
  [], ["사람을 피함"], ["경계심 강함"], ["마른 상태"], ["차 밑에 숨음"],
  ["새끼 동반"], ["같은 자리 배회"], ["사람을 잘 따름"],
];
const INJURY_TAGS = [
  ["다리를 절음"], ["눈 주변 상처"], ["귀에 상처"], ["호흡이 거침"],
];

const SEXES = ["unknown", "male", "unknown", "female", "unknown"];
const pick = (list, n) => list[n % list.length];

// 부상 제보는 격자를 넓혀 특정 가능성을 낮추는 coarseGridMetersFor 와 같은 기준
const gridFor = (injury) => (injury ? 1000 : 300);

// 기준점에서 방위각과 거리를 주고 좌표를 계산, 링마다 다른 방향으로 흩음
function ringPoint(anchor, meters, bearingDeg) {
  const bearing = bearingDeg * RAD;
  const lat = anchor.lat + (meters * Math.cos(bearing)) / METERS_PER_LAT_DEGREE;
  const lng =
    anchor.lng +
    (meters * Math.sin(bearing)) / (METERS_PER_LAT_DEGREE * Math.cos(lat * RAD));
  return { lat, lng };
}

function buildSpot(anchorIndex, ringIndex) {
  const anchor = ANCHORS[anchorIndex];
  const seq = anchorIndex * RINGS.length + ringIndex;
  const meters = RINGS[ringIndex];
  // 황금각으로 방위를 돌려 지점끼리 같은 방향에 몰리지 않게 함
  const bearing = (anchorIndex * 137.5 + ringIndex * 72) % 360;
  const point = ringPoint(anchor, meters, bearing);
  const animalType = pick(TYPE_CYCLE, seq);
  const injury = seq % 7 === 3;
  const care = seq % 10 < 3 ? "in_care" : "roaming";
  const landmark = `${anchor.name} ${RING_SUFFIX[ringIndex]}`;
  const base = {
    seq,
    animalType,
    point,
    injury,
    care,
    landmark,
    ringM: meters,
    anchorName: anchor.name,
    sex: pick(SEXES, seq),
  };

  if (animalType === "dog") {
    const dog = pick(DOGS, seq);
    const tags = injury ? pick(INJURY_TAGS, seq) : pick(DOG_TAGS, seq);
    return {
      ...base,
      photoBreed: dog.photo,
      breedLabel: dog.label,
      size: dog.size,
      colors: dog.colors,
      collar: seq % 4 === 1,
      earTip: null,
      appearance:
        `${dog.colors.join("과 ")} 털의 ${sizeWord(dog.size)}입니다. ` +
        (dog.label ? `${dog.label} 계열로 보입니다` : "품종은 알아보기 어려웠습니다"),
      tags,
    };
  }

  if (animalType === "cat") {
    const cat = pick(CATS, seq);
    const tags = injury ? pick(INJURY_TAGS, seq) : pick(CAT_TAGS, seq);
    return {
      ...base,
      photoBreed: null,
      breedLabel: cat.label,
      size: "small",
      colors: cat.colors,
      collar: seq % 9 === 2,
      // 귀 끝 잘림은 관찰값일 뿐 중성화 여부를 확정하지 않음
      earTip: seq % 5 === 0 ? true : seq % 5 === 1 ? false : null,
      appearance: `${cat.pattern}의 고양이입니다. ${catBehavior(seq)}`,
      tags: seq % 5 === 0 ? [...tags, "귀 끝 잘림"] : tags,
    };
  }

  const other = pick(OTHERS, seq);
  return {
    ...base,
    photoBreed: null,
    breedLabel: other.label,
    size: other.size,
    colors: other.colors,
    collar: null,
    earTip: null,
    appearance: other.note,
    tags: injury ? pick(INJURY_TAGS, seq) : [],
  };
}

const sizeWord = (size) =>
  size === "large" ? "대형견" : size === "medium" ? "중형견" : "소형견";

const CAT_BEHAVIOR = [
  "사람이 다가가자 거리를 두고 지켜봤습니다",
  "주차된 차 아래에 들어가 있었습니다",
  "울음소리를 내며 따라왔습니다",
  "화단 근처에 계속 머물렀습니다",
  "몸이 마른 편이었습니다",
];
const catBehavior = (n) => pick(CAT_BEHAVIOR, n);

async function fetchDogPhoto(breed) {
  const list = await fetch(`https://dog.ceo/api/breed/${breed}/images/random`);
  const body = await list.json();
  if (body.status !== "success") throw new Error(`품종 키 오류: ${breed}`);
  const image = await fetch(body.message);
  if (!image.ok) throw new Error(`사진을 받지 못했습니다: ${body.message}`);
  return new Uint8Array(await image.arrayBuffer());
}

async function fetchCatPhoto() {
  const list = await fetch("https://api.thecatapi.com/v1/images/search");
  const [first] = await list.json();
  if (!first?.url) throw new Error("고양이 사진 목록이 비었습니다");
  const image = await fetch(first.url);
  if (!image.ok) throw new Error(`사진을 받지 못했습니다: ${first.url}`);
  return new Uint8Array(await image.arrayBuffer());
}

async function uploadPhoto(objectPath, body, contentType) {
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${PHOTO_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": contentType,
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

// 순차 실행하면 300건에 10분이 넘어 워커를 나눔
async function runPool(items, size, worker) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await worker(items[index], index);
      }
    }),
  );
}

const SPOTS = ANCHORS.flatMap((_, anchorIndex) =>
  RINGS.map((__, ringIndex) => buildSpot(anchorIndex, ringIndex)),
);

const sql = postgres(DATABASE_URL, { prepare: false, max: CONCURRENCY });
const now = Date.now();
let done = 0;
let photoFailed = 0;

try {
  await runPool(SPOTS, CONCURRENCY, async (spot) => {
    const id = `${ID_PREFIX}${String(spot.seq + 1).padStart(8, "0")}`;
    const grid = gridFor(spot.injury);
    const coarse = snapToGrid(spot.point, grid);
    const area = await resolveArea(spot.point);
    // 최근 30일에 흩어 두어 목록 정렬이 한 시각에 몰리지 않게 함
    const occurredAt = new Date(now - (((spot.seq * 137) % 700) + 2) * 3_600_000);

    await sql`
      insert into reports (
        id, kind, visibility, lifecycle, care_situation, animal_type, breed_guess, appearance,
        colors, size, sex, neutered, condition_tags, collar, injury, ear_tip,
        coarse_point, coarse_grid_m, location_source,
        area_code_system, area_code, area_name, landmark_note, occurred_at
      ) values (
        ${id}, 'sighting', 'public', 'active', ${spot.care}, ${spot.animalType},
        ${spot.breedLabel}, ${spot.appearance},
        ${spot.colors}, ${spot.size}, ${spot.sex}, 'unknown', ${spot.tags},
        ${spot.collar}, ${spot.injury}, ${spot.earTip},
        ST_SetSRID(ST_MakePoint(${coarse.lng}, ${coarse.lat}), 4326), ${grid}, 'gps',
        ${area ? "H" : null}, ${area?.code ?? null}, ${area?.name ?? null},
        ${spot.landmark}, ${occurredAt}
      )
      on conflict (id) do update set
        care_situation = excluded.care_situation,
        animal_type = excluded.animal_type,
        breed_guess = excluded.breed_guess,
        appearance = excluded.appearance,
        colors = excluded.colors,
        size = excluded.size,
        sex = excluded.sex,
        condition_tags = excluded.condition_tags,
        collar = excluded.collar,
        injury = excluded.injury,
        ear_tip = excluded.ear_tip,
        coarse_point = excluded.coarse_point,
        coarse_grid_m = excluded.coarse_grid_m,
        area_code_system = excluded.area_code_system,
        area_code = excluded.area_code,
        area_name = excluded.area_name,
        landmark_note = excluded.landmark_note,
        occurred_at = excluded.occurred_at
    `;

    if (spot.animalType !== "other") {
      const objectPath = `${id}/0.jpg`;
      try {
        const bytes = spot.photoBreed
          ? await fetchDogPhoto(spot.photoBreed)
          : await fetchCatPhoto();
        await uploadPhoto(objectPath, bytes, "image/jpeg");
        await sql`delete from report_photos where report_id = ${id}`;
        await sql`
          insert into report_photos (report_id, storage_path, sort_order)
          values (${id}, ${objectPath}, 0)
        `;
      } catch (error) {
        // 외부 사진 원천이 끊겨도 제보 행은 남겨 두고 건수만 셈
        photoFailed += 1;
        process.stderr.write(`사진 실패 ${id} ${error.message}\n`);
      }
    }

    done += 1;
    if (done % 20 === 0) process.stdout.write(`${done}/${SPOTS.length}\n`);
  });

  const summary = await sql`
    select animal_type, count(*) from reports
    where id::text like ${`${ID_PREFIX}%`} group by 1 order by 1
  `;
  process.stdout.write(`\n제보 ${done}건을 넣었습니다, 사진 실패 ${photoFailed}건\n`);
  for (const row of summary) process.stdout.write(`  ${row.animal_type} ${row.count}\n`);
  process.stdout.write(`지우려면 delete from reports where id::text like '${ID_PREFIX}%'\n`);
} finally {
  await sql.end();
}
