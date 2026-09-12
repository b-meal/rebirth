// 전국 시군구의 주민센터·경로당·정류장 같은 실제 장소에 발견 제보를 넣는 스크립트
// 고정 UUID 대역이라 다시 실행해도 건수가 늘지 않음

import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
if (!KAKAO_REST_API_KEY) throw new Error("KAKAO_REST_API_KEY 가 필요합니다");

const STORAGE = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1`;
const PHOTO_BUCKET = "report-photos";
// 과천 데모 20건의 00000000-0000-4000-8000-0000 대역과 겹치지 않는 구간
const ID_PREFIX = "00000000-0000-4000-8000-1000";
const CONCURRENCY = 8;
// 시군구청에서 장소를 찾는 반경, 군 지역 읍내까지 닿는 크기
const PLACE_RADIUS_M = 8000;
// 키워드 한 개에서 쓸 장소 수, 전체 건수는 시군구 수 x 키워드 수 x 이 값
const PLACES_PER_KEYWORD = 4;
// 장소 검색 결과 캐시, 다시 실행할 때 카카오 호출 1600 회를 건너뜀
const PLACE_CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".places-cache.json");

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

// 생활 반경에서 동물이 실제로 눈에 띄는 곳, 카카오 로컬에 등록이 많은 순
const PLACE_KEYWORDS = [
  "주민센터",
  "경로당",
  "버스정류장",
  "어린이공원",
  "초등학교",
  "우체국",
  "공영주차장",
];

// 장소에서 목격 지점까지 떨어진 거리, 등차로 두어 거리 분포가 한쪽에 몰리지 않음
const OFFSETS = [60, 140, 220, 300];

// 장소 이름 뒤에 붙는 지형물 표현, 오프셋이 커질수록 먼 표현을 씀
const OFFSET_SUFFIX = ["앞", "옆 골목", "뒤편 화단", "건너편 보도"];

// 전국 시군구, 카카오 검색이 같은 이름을 구분하도록 시도명을 앞에 붙임
const SIGUNGU = {
  서울: ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
    "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
    "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"],
  부산: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구",
    "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군"],
  대구: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  인천: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군"],
  광주: ["동구", "서구", "남구", "북구", "광산구"],
  대전: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산: ["중구", "남구", "동구", "북구", "울주군"],
  세종: ["세종특별자치시"],
  경기: ["수원시", "성남시", "의정부시", "안양시", "부천시", "광명시", "평택시", "동두천시",
    "안산시", "고양시", "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시",
    "의왕시", "하남시", "용인시", "파주시", "이천시", "안성시", "김포시", "화성시",
    "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군"],
  강원: ["춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군",
    "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군",
    "고성군", "양양군"],
  충북: ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군",
    "괴산군", "음성군", "단양군"],
  충남: ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시",
    "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"],
  전북: ["전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군",
    "무주군", "장수군", "임실군", "순창군", "고창군", "부안군"],
  전남: ["목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군",
    "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군",
    "함평군", "영광군", "장성군", "완도군", "진도군", "신안군"],
  경북: ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시",
    "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군",
    "성주군", "칠곡군", "예천군", "봉화군", "울진군"],
  경남: ["창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시",
    "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군",
    "거창군", "합천군"],
  제주: ["제주시", "서귀포시"],
};

const ANCHOR_QUERIES = Object.entries(SIGUNGU).flatMap(([sido, list]) =>
  list.map((gu) => `${sido} ${gu}청`),
);

// 개 50 고양이 40 기타 10 비율, 장소마다 잘려 지역별 구성이 달라짐
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
  { photo: "pekinese", label: "페키니즈", size: "small", colors: ["황색"] },
  { photo: "beagle", label: "비글", size: "medium", colors: ["갈색", "흰색"] },
  { photo: "corgi/cardigan", label: "웰시 코기", size: "medium", colors: ["갈색", "흰색"] },
  { photo: "shiba", label: "시바", size: "medium", colors: ["황색"] },
  { photo: "schnauzer/miniature", label: "슈나우저", size: "medium", colors: ["회색"] },
  { photo: "bulldog/french", label: "프렌치 불도그", size: "medium", colors: ["검정색"] },
  { photo: "sheepdog/shetland", label: null, size: "medium", colors: ["갈색", "흰색"] },
  { photo: "terrier/westhighland", label: "웨스트 하이랜드 테리어", size: "medium", colors: ["흰색"] },
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

// 개와 고양이가 아닌 제보, 사진은 위키미디어 공용에서 받음
const OTHERS = [
  { slug: "rabbit", query: "domestic rabbit", label: "토끼", size: "small", colors: ["흰색"],
    note: "귀가 길고 앞니가 드러난 소동물입니다" },
  { slug: "hedgehog", query: "pet hedgehog", label: "고슴도치", size: "small", colors: ["갈색"],
    note: "등에 가시가 있는 소동물입니다" },
  { slug: "guineapig", query: "guinea pig", label: "기니피그", size: "small", colors: ["흰색", "갈색"],
    note: "꼬리가 없는 통통한 소동물입니다" },
  { slug: "ferret", query: "domestic ferret", label: "페럿", size: "small", colors: ["흰색", "갈색"],
    note: "몸이 길고 다리가 짧은 소동물입니다" },
  { slug: "parrot", query: "cockatiel parrot", label: "앵무새", size: "small", colors: ["흰색"],
    note: "사람 손에 앉으려 하는 중형 조류입니다" },
  { slug: "turtle", query: "red-eared slider turtle", label: "거북", size: "small", colors: ["갈색"],
    note: "등껍질이 단단한 소동물이 보도를 기어가고 있었습니다" },
  { slug: "chicken", query: "hen chicken farm", label: "닭", size: "medium", colors: ["흰색"],
    note: "주택가를 돌아다니는 가금류입니다" },
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
const CAT_BEHAVIOR = [
  "사람이 다가가자 거리를 두고 지켜봤습니다",
  "주차된 차 아래에 들어가 있었습니다",
  "울음소리를 내며 따라왔습니다",
  "화단 근처에 계속 머물렀습니다",
  "몸이 마른 편이었습니다",
];
const SEXES = ["unknown", "male", "unknown", "female", "unknown"];

const pick = (list, n) => list[n % list.length];
const sizeWord = (size) =>
  size === "large" ? "대형견" : size === "medium" ? "중형견" : "소형견";

// 부상 제보는 격자를 넓혀 특정 가능성을 낮추는 coarseGridMetersFor 와 같은 기준
const gridFor = (injury) => (injury ? 1000 : 300);

// 기준점에서 방위각과 거리를 주고 좌표를 계산, 장소마다 다른 방향으로 흩음
function offsetPoint(base, meters, bearingDeg) {
  const bearing = bearingDeg * RAD;
  const lat = base.lat + (meters * Math.cos(bearing)) / METERS_PER_LAT_DEGREE;
  const lng =
    base.lng +
    (meters * Math.sin(bearing)) / (METERS_PER_LAT_DEGREE * Math.cos(lat * RAD));
  return { lat, lng };
}

// 순차 실행하면 수천 건에 한 시간이 넘어 워커를 나눔
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

// 타임아웃이 없으면 카카오가 응답을 미룰 때 워커가 영구 대기에 빠짐
const FETCH_TIMEOUT_MS = 12_000;

async function kakao(pathname, params, tries = 3) {
  const query = new URLSearchParams(params);
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const response = await fetch(`https://dapi.kakao.com${pathname}?${query}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch {
      // 타임아웃과 네트워크 오류는 짧게 쉬고 다시 시도
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

// 시군구청 좌표를 받아 장소 검색의 중심으로 씀
async function resolveAnchor(query) {
  const body = await kakao("/v2/local/search/keyword.json", { query, size: 1 });
  const doc = body?.documents?.[0];
  if (!doc) return null;
  return { query, lat: Number(doc.y), lng: Number(doc.x) };
}

async function searchPlaces(anchor, keyword) {
  const body = await kakao("/v2/local/search/keyword.json", {
    query: keyword,
    x: String(anchor.lng),
    y: String(anchor.lat),
    radius: String(PLACE_RADIUS_M),
    size: "15",
    sort: "distance",
  });
  return (body?.documents ?? []).slice(0, PLACES_PER_KEYWORD).map((doc) => ({
    id: doc.id,
    name: doc.place_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
  }));
}

// 같은 동네 장소가 역지오코딩을 반복하지 않도록 1km 격자로 묶은 캐시
const areaCache = new Map();
async function resolveArea({ lat, lng }) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (areaCache.has(key)) return areaCache.get(key);

  const pending = (async () => {
    const body = await kakao("/v2/local/geo/coord2regioncode.json", {
      x: String(lng),
      y: String(lat),
    });
    const region =
      body?.documents?.find((d) => d.region_type === "H") ?? body?.documents?.[0];
    if (!region) return null;
    return {
      code: region.code,
      name: [region.region_1depth_name, region.region_2depth_name, region.region_3depth_name]
        .filter(Boolean)
        .join(" "),
    };
  })();

  areaCache.set(key, pending);
  return pending;
}

async function storageList(prefix) {
  const response = await fetch(`${STORAGE}/object/list/${PHOTO_BUCKET}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  if (!response.ok) return new Set();
  const items = await response.json();
  return new Set(items.map((item) => `${prefix}${item.name}`));
}

async function uploadPhoto(objectPath, body) {
  const response = await fetch(`${STORAGE}/object/${PHOTO_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "image/jpeg",
      "x-upsert": "true",
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`업로드 실패 ${response.status} ${(await response.text()).slice(0, 120)}`);
  }
}

async function fetchBytes(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`받지 못했습니다 ${response.status} ${url.slice(0, 80)}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function dogImageUrl(breed) {
  const body = await (await fetch(`https://dog.ceo/api/breed/${breed}/images/random`)).json();
  if (body.status !== "success") throw new Error(`품종 키 오류: ${breed}`);
  return body.message;
}

async function catImageUrl() {
  const [first] = await (
    await fetch("https://api.thecatapi.com/v1/images/search")
  ).json();
  if (!first?.url) throw new Error("고양이 사진 목록이 비었습니다");
  return first.url;
}

// 위키미디어 공용은 요청자 표시를 요구해 User-Agent 를 붙임
const WIKI_UA = "rebirth-seed/1.0 (https://github.com/b-meal/rebirth) demo-data";
async function wikiImageUrls(query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrlimit: "20",
    gsrnamespace: "6",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "900",
    format: "json",
  });
  const body = await (
    await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "user-agent": WIKI_UA },
    })
  ).json();
  return Object.values(body.query?.pages ?? {})
    .map((page) => page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url)
    .filter(Boolean);
}

// 사진 한 장을 여러 제보가 함께 참조해 수천 건에도 저장 용량이 늘지 않음
const PHOTOS_PER_DOG_BREED = 5;
const CAT_PHOTO_COUNT = 50;
const PHOTOS_PER_OTHER = 5;
const slugOf = (key) => key.replace(/\//g, "-");

async function buildPhotoPool() {
  const existing = new Set([
    ...(await storageList("pool/dog/")),
    ...(await storageList("pool/cat/")),
    ...(await storageList("pool/other/")),
  ]);

  const jobs = [];
  for (const dog of DOGS) {
    for (let i = 0; i < PHOTOS_PER_DOG_BREED; i += 1) {
      jobs.push({ key: `pool/dog/${slugOf(dog.photo)}-${i}.jpg`, kind: "dog", breed: dog.photo });
    }
  }
  for (let i = 0; i < CAT_PHOTO_COUNT; i += 1) {
    jobs.push({ key: `pool/cat/${i}.jpg`, kind: "cat" });
  }
  for (const other of OTHERS) {
    for (let i = 0; i < PHOTOS_PER_OTHER; i += 1) {
      jobs.push({ key: `pool/other/${other.slug}-${i}.jpg`, kind: "other", other, index: i });
    }
  }

  const wiki = new Map();
  let uploaded = 0;
  let failed = 0;

  await runPool(jobs, 8, async (job) => {
    if (existing.has(job.key)) return;
    try {
      let url;
      if (job.kind === "dog") url = await dogImageUrl(job.breed);
      else if (job.kind === "cat") url = await catImageUrl();
      else {
        if (!wiki.has(job.other.slug)) wiki.set(job.other.slug, wikiImageUrls(job.other.query));
        const urls = await wiki.get(job.other.slug);
        if (urls.length === 0) throw new Error(`위키 결과 없음 ${job.other.slug}`);
        url = urls[job.index % urls.length];
      }
      await uploadPhoto(job.key, await fetchBytes(url, { "user-agent": WIKI_UA }));
      uploaded += 1;
    } catch (error) {
      failed += 1;
      process.stderr.write(`사진 풀 실패 ${job.key} ${error.message}\n`);
    }
  });

  const pool = new Set([
    ...(await storageList("pool/dog/")),
    ...(await storageList("pool/cat/")),
    ...(await storageList("pool/other/")),
  ]);
  process.stdout.write(`사진 풀 ${pool.size}장 준비, 신규 ${uploaded}장, 실패 ${failed}장\n`);
  return pool;
}

function buildReport(place, seq, pool) {
  const animalType = pick(TYPE_CYCLE, seq);
  const injury = seq % 9 === 4;
  const care = seq % 10 < 3 ? "in_care" : "roaming";
  const offsetIndex = seq % OFFSETS.length;
  // 황금각으로 방위를 돌려 장소끼리 같은 방향에 몰리지 않게 함
  const point = offsetPoint(place, OFFSETS[offsetIndex], (seq * 137.5) % 360);
  const landmark = `${place.name} ${OFFSET_SUFFIX[offsetIndex]}`;
  const base = { seq, animalType, point, injury, care, landmark, sex: pick(SEXES, seq) };
  const hasPhoto = (key) => (pool.has(key) ? key : null);

  if (animalType === "dog") {
    const dog = pick(DOGS, seq);
    return {
      ...base,
      breedLabel: dog.label,
      size: dog.size,
      colors: dog.colors,
      collar: seq % 4 === 1,
      earTip: null,
      appearance:
        `${dog.colors.join("과 ")} 털의 ${sizeWord(dog.size)}입니다. ` +
        (dog.label ? `${dog.label} 계열로 보입니다` : "품종은 알아보기 어려웠습니다"),
      tags: injury ? pick(INJURY_TAGS, seq) : pick(DOG_TAGS, seq),
      photoPath: hasPhoto(
        `pool/dog/${slugOf(dog.photo)}-${seq % PHOTOS_PER_DOG_BREED}.jpg`,
      ),
    };
  }

  if (animalType === "cat") {
    const cat = pick(CATS, seq);
    const tags = injury ? pick(INJURY_TAGS, seq) : pick(CAT_TAGS, seq);
    return {
      ...base,
      breedLabel: cat.label,
      size: "small",
      colors: cat.colors,
      collar: seq % 9 === 2,
      // 귀 끝 잘림은 관찰값일 뿐 중성화 여부를 확정하지 않음
      earTip: seq % 5 === 0 ? true : seq % 5 === 1 ? false : null,
      appearance: `${cat.pattern}의 고양이입니다. ${pick(CAT_BEHAVIOR, seq)}`,
      tags: seq % 5 === 0 ? [...tags, "귀 끝 잘림"] : tags,
      photoPath: hasPhoto(`pool/cat/${seq % CAT_PHOTO_COUNT}.jpg`),
    };
  }

  const other = pick(OTHERS, seq);
  return {
    ...base,
    breedLabel: other.label,
    size: other.size,
    colors: other.colors,
    collar: null,
    earTip: null,
    appearance: other.note,
    tags: injury ? pick(INJURY_TAGS, seq) : [],
    photoPath: hasPhoto(`pool/other/${other.slug}-${seq % PHOTOS_PER_OTHER}.jpg`),
  };
}

async function collectPlaces() {
  if (existsSync(PLACE_CACHE)) {
    const cached = JSON.parse(readFileSync(PLACE_CACHE, "utf8"));
    process.stdout.write(`장소 캐시 ${cached.length}곳 사용\n`);
    return cached;
  }

  process.stdout.write(`시군구 ${ANCHOR_QUERIES.length}곳 좌표를 받는 중\n`);
  const anchors = [];
  await runPool(ANCHOR_QUERIES, 8, async (query) => {
    const anchor = await resolveAnchor(query);
    if (anchor) anchors.push(anchor);
    else process.stderr.write(`좌표 실패 ${query}\n`);
  });
  process.stdout.write(`좌표 ${anchors.length}곳 확보\n`);

  process.stdout.write(`장소를 ${PLACE_KEYWORDS.length}개 키워드로 찾는 중\n`);
  const found = [];
  const seenPlace = new Set();
  const searches = anchors.flatMap((anchor) =>
    PLACE_KEYWORDS.map((keyword) => ({ anchor, keyword })),
  );
  await runPool(searches, 8, async ({ anchor, keyword }) => {
    for (const place of await searchPlaces(anchor, keyword)) {
      // 키워드가 겹쳐 같은 장소가 두 번 나오면 한 번만 씀
      if (seenPlace.has(place.id)) continue;
      seenPlace.add(place.id);
      found.push(place);
    }
  });
  writeFileSync(PLACE_CACHE, JSON.stringify(found));
  process.stdout.write(`장소 ${found.length}곳 수집\n`);
  return found;
}

const places = await collectPlaces();

const pool = await buildPhotoPool();

// 5432 는 세션 모드라 클라이언트 15개에서 막힘, 트랜잭션 모드로 붙어 동시 실행을 냄
const POOL_URL = DATABASE_URL.replace(":5432/", ":6543/");
// dev 서버가 슬롯을 쓰고 있어 커넥션은 작게 잡고 대기는 postgres 큐에 맡김
const sql = postgres(POOL_URL, { prepare: false, max: 3, connect_timeout: 20 });
const now = Date.now();
let done = 0;
let failed = 0;

try {
  // 장소 구성이 바뀌면 사진 연결도 달라져 이 대역의 기존 연결을 먼저 비움
  await sql`delete from report_photos where report_id::text like ${`${ID_PREFIX}%`}`;

  async function insertReport(place, index) {
    const spot = buildReport(place, index, pool);
    const id = `${ID_PREFIX}${String(index + 1).padStart(8, "0")}`;
    const grid = gridFor(spot.injury);
    const coarse = snapToGrid(spot.point, grid);
    const area = await resolveArea(spot.point);
    // 최근 30일에 흩어 두어 목록 정렬이 한 시각에 몰리지 않게 함
    const occurredAt = new Date(now - (((index * 137) % 700) + 2) * 3_600_000);

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

    if (spot.photoPath) {
      await sql`
        insert into report_photos (report_id, storage_path, sort_order)
        values (${id}, ${spot.photoPath}, 0)
      `;
    }

  }

  const retry = [];
  await runPool(places, CONCURRENCY, async (place, index) => {
    try {
      await insertReport(place, index);
      done += 1;
      if (done % 500 === 0) process.stdout.write(`${done}/${places.length}\n`);
    } catch {
      // 연결 슬롯이 막히면 뒤로 미뤄 두고 끝에서 천천히 다시 넣음
      retry.push({ place, index });
    }
  });

  if (retry.length > 0) {
    process.stdout.write(`밀린 ${retry.length}건을 다시 넣는 중\n`);
    for (const { place, index } of retry) {
      try {
        await insertReport(place, index);
        done += 1;
      } catch (error) {
        failed += 1;
        process.stderr.write(`삽입 실패 ${index} ${error.message}\n`);
      }
    }
  }

  const summary = await sql`
    select animal_type, count(*)::int as count,
      count(*) filter (where exists (
        select 1 from report_photos p where p.report_id = reports.id
      ))::int as with_photo
    from reports where id::text like ${`${ID_PREFIX}%`} group by 1 order by 1
  `;
  process.stdout.write(`\n제보 ${done}건을 넣었습니다, 실패 ${failed}건\n`);
  for (const row of summary) {
    process.stdout.write(`  ${row.animal_type} ${row.count}건, 사진 ${row.with_photo}건\n`);
  }
  process.stdout.write(`지우려면 delete from reports where id::text like '${ID_PREFIX}%'\n`);
} finally {
  await sql.end();
}
