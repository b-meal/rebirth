// 데모용 커뮤니티 글 200건과 댓글·공감을 넣는 스크립트, 고정 UUID 라 다시 실행해도 늘지 않음
// 사진은 seed-nationwide 가 올려 둔 pool/ 을 다시 참조해 저장 용량을 늘리지 않음

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// loadEnvFile 은 셸에 이미 있는 값을 덮지 않아 다른 프로젝트 키가 섞임, 파일을 원천으로 둠
// CRLF 파일에서 $ 가 \r 앞에서 걸리지 않아 줄 나눔에서 함께 떼어 냄
function readEnvFile(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
  return env;
}

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
  readEnvFile(path.join(repoRoot, ".env.local"));
if (!DATABASE_URL) throw new Error("DATABASE_URL 이 없습니다");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다");
}

const POST_COUNT = 200;
// 이 중 앞쪽 일부는 팀원이 사는 동탄과 수원에 고정으로 배정함
// reports 에서 뽑은 동네만 쓰면 동탄이 한 건도 걸리지 않아 화면에서 빈 동네가 됨
const LOCAL_POST_COUNT = 60;
// 과천 20건의 0000 대역, 전국 제보의 1000 대역과 겹치지 않는 구간
const POST_PREFIX = "00000000-0000-4000-8000-2000";
const AUTHOR_PREFIX = "00000000-0000-4000-8000-3000";
const PHOTO_BUCKET = "report-photos";
const STORAGE = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1`;

// 계정이 지워져도 글은 남아야 하므로 피드는 left join 이지만
// 작성자 프로필이 없으면 카드가 전부 알 수 없음으로 보임
const AUTHORS = [
  { name: "성수동집사", provider: "kakao" },
  { name: "밤톨이보호자", provider: "google" },
  { name: "동네한바퀴", provider: "kakao" },
  { name: "골목길산책", provider: "google" },
  { name: "초록대문", provider: "kakao" },
  { name: "구름이네", provider: "google" },
  { name: "양지바른창가", provider: "kakao" },
  { name: "느린걸음", provider: "google" },
  { name: "노을공원", provider: "kakao" },
  { name: "겨울이아빠", provider: "google" },
  { name: "빵집앞고양이", provider: "kakao" },
  { name: "하루세번산책", provider: "google" },
];

// 동탄과 수원의 행정동, 동탄은 화성시라 reports 의 남양읍 쪽만 잡혀 직접 적어 둠
// 커뮤니티 area_name 은 region_3depth_name 과 같은 동 이름만 담음
const LOCAL_DONGS = [
  "동탄1동", "동탄2동", "동탄3동", "동탄4동", "동탄5동", "동탄6동",
  "동탄7동", "동탄8동", "동탄9동", "반월동", "진안동", "병점1동",
  "권선1동", "권선2동", "인계동", "매탄1동", "매탄3동", "영통1동",
  "영통2동", "광교1동", "광교2동", "정자1동", "정자3동", "행궁동",
  "세류1동", "우만1동", "율천동", "파장동",
];

// 사진 풀 구성, seed-nationwide 의 업로드 개수와 같은 값
const PHOTOS_PER_DOG_BREED = 5;
const CAT_PHOTO_COUNT = 50;
const PHOTOS_PER_OTHER = 5;
const DOG_SLUGS = [
  "maltese", "shihtzu", "pomeranian", "poodle-toy", "chihuahua", "dachshund",
  "terrier-yorkshire", "spitz-japanese", "pug", "papillon", "pekinese", "beagle",
  "corgi-cardigan", "shiba", "schnauzer-miniature", "bulldog-french",
  "sheepdog-shetland", "terrier-westhighland", "retriever-golden", "labrador",
  "husky", "samoyed", "akita", "malinois",
];
const OTHER_SLUGS = ["rabbit", "hedgehog", "guineapig", "ferret", "parrot", "turtle", "chicken"];

// 주제별 글감, 제목과 본문을 함께 두어 카드와 상세가 따로 놀지 않게 함
// 품종을 단정하지 않고 개체 동일성도 확정하지 않는 문장만 씀
const TOPICS = {
  sighting_talk: [
    {
      title: "{dong} 골목에서 흰 소형견을 봤어요",
      body: "오늘 아침 {dong} 골목 화단 근처에서 흰색 소형견을 봤습니다. 말티즈 계열로 보이는데 확실하지는 않아요. 목줄은 없었고 사람이 다가가니 조금 물러섰습니다. 가까이 가면 놀랄 것 같아 사진만 멀리서 찍었어요. 혹시 근처에서 찾는 분 계실까 해서 올려 둡니다.",
    },
    {
      title: "{dong} 주차장 차 밑에 고양이가 있어요",
      body: "{dong} 공영주차장에서 차 아래에 있는 고양이를 봤습니다. 회색 줄무늬였고 사람을 경계하면서도 자리를 뜨지는 않았어요. 차 빼실 때 한 번씩 아래를 봐 주시면 좋겠습니다. 계속 같은 자리에 머무는 것 같아 며칠 더 지켜보려고 합니다.",
    },
    {
      title: "{dong} 하천 산책로에서 중형견을 봤습니다",
      body: "{dong} 하천 산책로 벤치 근처에서 갈색 중형견이 혼자 걷고 있었어요. 목줄이 채워져 있었는데 줄 끝이 끊어진 것처럼 보였습니다. 사람을 따라오지는 않고 거리를 두었어요. 제보로 올릴 만큼 확실하지 않아 여기에 먼저 적어 둡니다.",
    },
    {
      title: "어제 본 아이가 오늘도 {dong}에 있네요",
      body: "어제 {dong} 놀이터 근처에서 본 검은 소형견이 오늘도 같은 자리에 있었습니다. 같은 아이인지 확인할 수는 없지만 크기와 색이 비슷했어요. 물그릇을 두고 왔는데 이런 경우 어떻게 하는 게 맞을까요.",
    },
    {
      title: "{dong} 편의점 앞에서 목줄 있는 아이를 봤어요",
      body: "{dong} 편의점 앞에 목줄을 한 소형견이 혼자 앉아 있었습니다. 인식표는 보이지 않았어요. 주인을 기다리는 것 같기도 해서 20분쯤 지켜봤는데 아무도 오지 않았습니다. 근처 가게에 말씀은 드려 뒀어요.",
    },
    {
      title: "{dong} 아파트 단지에서 고양이 가족을 봤습니다",
      body: "{dong} 아파트 화단 쪽에서 어미로 보이는 고양이와 작은 아이들을 봤어요. 사람이 지나가면 바로 숨습니다. 공사 소음이 있는 곳이라 자리를 옮기지 않을까 걱정돼서 적어 둡니다.",
    },
    {
      title: "{dong} 버스정류장 뒤편에 아이가 있어요",
      body: "{dong} 버스정류장 뒤편 수풀에서 황색 털의 소형견을 봤습니다. 몸이 마른 편이었어요. 품종은 잘 모르겠고 다리를 저는 것 같지는 않았습니다. 혹시 같은 아이를 보신 분 있으신가요.",
    },
  ],
  reunion: [
    {
      title: "{dong}에서 잃어버린 아이를 찾았습니다",
      body: "지난주 {dong}에서 잃어버린 아이를 어제 찾았습니다. 이웃분이 사진을 보고 연락을 주셔서 확인하러 갔고 저희 아이가 맞았어요. 글 올려 주시고 같이 찾아봐 주신 분들 정말 고맙습니다. 목줄과 인식표는 바로 바꿨습니다.",
    },
    {
      title: "사흘 만에 만났어요",
      body: "{dong} 근처에서 사흘 동안 못 찾다가 어제 저녁에 만났습니다. 임시보호해 주시던 분이 올려 주신 글을 보고 연락드렸어요. 확인하러 가는 길이 제일 길게 느껴졌습니다. 도와주신 분들께 감사드려요.",
    },
    {
      title: "{dong} 이웃분 덕분에 무사히 돌아왔습니다",
      body: "{dong}에서 사라진 뒤 이틀 만에 돌아왔습니다. 근처 가게 사장님이 물과 사료를 챙겨 주고 계셨다고 해요. 인사드리러 다녀왔습니다. 이런 일이 있을 때 어디에 먼저 알려야 하는지도 이번에 알게 됐어요.",
    },
    {
      title: "찾는 데 도움이 된 것들 정리해 봤어요",
      body: "{dong}에서 아이를 찾은 뒤에 정리해 봤습니다. 사진은 옆모습과 전신을 같이 두는 게 알아보기 쉬웠고, 자주 가던 산책길을 시간대별로 다시 도는 게 도움이 됐어요. 같은 상황에 계신 분께 조금이라도 보탬이 되면 좋겠습니다.",
    },
    {
      title: "임시보호 두 달 만에 가족을 만났어요",
      body: "{dong}에서 데려와 두 달 동안 돌보던 아이가 어제 가족을 찾았습니다. 확인할 것들을 천천히 맞춰 보고 결정했어요. 보내는 날 생각보다 많이 울었습니다. 잘 지내라고 인사했어요.",
    },
  ],
  care_tip: [
    {
      title: "임시보호 처음 시작할 때 준비한 것들",
      body: "처음 임시보호를 맡게 돼서 준비했던 것들을 적어 둡니다. 사료는 원래 먹던 걸 알 수 없어 소량으로 여러 종류를 준비했고, 화장실과 잠자리는 구석 쪽에 뒀어요. 첫 이틀은 억지로 만지지 않고 같은 방에 있기만 했습니다. 병원 검진은 데려온 날 바로 다녀왔어요.",
    },
    {
      title: "겁 많은 아이와 지내는 첫 주",
      body: "{dong}에서 데려온 아이가 사람 손을 무서워해서 첫 주 동안 한 것들입니다. 눈을 오래 마주치지 않고, 다가올 때까지 기다리고, 밥그릇을 놓을 때도 등을 보이지 않게 했어요. 일주일쯤 지나니 같은 공간에 누워 있게 됐습니다.",
    },
    {
      title: "병원 데려가기 전에 확인하면 좋은 것",
      body: "구조한 아이를 병원에 데려가기 전 확인하면 좋은 것들을 적어 봅니다. 발견한 장소와 시간, 먹은 것과 배변 상태, 눈에 보이는 상처 위치 정도를 메모해 가면 진료가 빨라졌어요. 인식칩 확인도 꼭 요청드리면 좋습니다.",
    },
    {
      title: "겨울철 길에서 지내는 아이들 물그릇",
      body: "날이 추워지면 물이 얼어서 물그릇을 어떻게 둘지 고민이 됩니다. 깊은 그릇이 얕은 것보다 늦게 얼었고, 바람이 덜 드는 벽 쪽에 두는 게 나았어요. 사료보다 물이 더 급한 경우가 많다고 들었습니다.",
    },
    {
      title: "사료 급여량 어떻게 정하고 계신가요",
      body: "임시보호 중인 아이 체중이 늘어서 급여량을 다시 보고 있습니다. 포장지 기준이 실제보다 넉넉한 것 같기도 해서요. 병원에서는 몸 상태를 보고 조절하라고 하셨는데 다들 어떻게 하고 계신지 궁금합니다.",
    },
    {
      title: "이동장에 익숙해지게 하는 방법",
      body: "병원 갈 때마다 이동장을 무서워해서 평소에 문을 열어 두고 방 안에 뒀습니다. 안에 담요와 간식을 두니 며칠 뒤부터 스스로 들어가 자더라고요. 급할 때 붙잡아 넣는 것보다 훨씬 나았습니다.",
    },
  ],
  neighborhood: [
    {
      title: "{dong} 근처 야간 진료 병원 아시는 분",
      body: "{dong} 근처에서 밤에 진료 가능한 동물병원을 찾고 있습니다. 지난주에 급한 일이 있었는데 어디로 가야 할지 몰라 한참 헤맸어요. 혹시 알고 계신 곳 있으면 알려 주시면 좋겠습니다.",
    },
    {
      title: "{dong} 산책로에 유리 조각이 있어요",
      body: "{dong} 산책로 초입 쪽에 깨진 유리가 흩어져 있습니다. 오늘 아침에 보고 눈에 보이는 건 치웠는데 풀숲 쪽은 손이 안 닿았어요. 산책 다니시는 분들 발 조심하시면 좋겠습니다.",
    },
    {
      title: "{dong}에 고양이 급식소가 생겼네요",
      body: "{dong} 공원 구석에 급식소가 새로 생긴 것 같습니다. 누가 관리하시는지는 모르겠는데 늘 깨끗하게 정리돼 있더라고요. 근처 지나실 때 발로 차이지 않게만 조심해 주시면 좋겠습니다.",
    },
    {
      title: "{dong} 주민들과 같이 해 볼 만한 일",
      body: "{dong}에서 겨울 전에 같이 해 볼 만한 게 있을까 해서 적어 봅니다. 급식소 주변 정리나 물그릇 교대로 챙기기 정도면 부담이 크지 않을 것 같아요. 관심 있으신 분 계시면 댓글 남겨 주세요.",
    },
    {
      title: "동네에서 목줄 없이 다니는 개를 자주 봅니다",
      body: "{dong} 쪽에서 목줄 없이 다니는 개를 요즘 자주 봅니다. 주인분이 근처에 계신 경우도 있는 것 같은데 아이들이 놀라는 걸 몇 번 봤어요. 서로 조심하면 좋겠다는 마음에 적어 둡니다.",
    },
    {
      title: "{dong} 근처에 반려동물 동반 가능한 카페",
      body: "{dong} 근처에 같이 들어갈 수 있는 카페가 어디 있는지 찾고 있습니다. 산책 나갔다가 잠깐 쉴 곳이 마땅치 않더라고요. 혹시 아시는 곳 있으면 공유해 주시면 감사하겠습니다.",
    },
  ],
};

// 주제별 댓글, 글에 붙어도 어색하지 않은 일반적인 반응만 둠
const COMMENTS = {
  sighting_talk: [
    "저도 어제 비슷한 아이를 그 근처에서 봤어요. 같은 아이인지는 확인해 봐야 할 것 같아요",
    "제보로도 한 번 올려 두시면 찾는 분이 보실 수도 있어요",
    "그 골목 자주 지나는데 오가면서 봐 둘게요",
    "사진 있으시면 같이 올려 주시면 알아보기 쉬울 것 같아요",
    "근처 가게에도 말씀드려 두면 도움이 되더라고요",
    "오늘 저녁에 한 번 가 볼게요. 있으면 다시 댓글 남기겠습니다",
  ],
  reunion: [
    "정말 다행이에요. 소식 보고 저도 마음이 놓입니다",
    "찾으셨다니 축하드려요",
    "이런 글 보면 계속 찾아볼 힘이 생겨요",
    "고생 많으셨습니다. 건강하게 잘 지내길 바랍니다",
    "저도 찾는 중인데 희망이 생기네요",
  ],
  care_tip: [
    "정리해 주셔서 감사합니다. 저장해 뒀어요",
    "저도 비슷한 방법으로 하고 있는데 도움이 많이 됐어요",
    "첫 주에 기다려 주는 게 제일 어렵더라고요",
    "병원 가기 전에 메모하는 건 생각 못 했네요. 해 봐야겠어요",
    "이동장 열어 두는 방법 저도 써 봤는데 효과 있었습니다",
  ],
  neighborhood: [
    "알려 주셔서 감사합니다. 조심할게요",
    "저도 같은 생각이었어요",
    "혹시 위치 조금 더 자세히 알 수 있을까요",
    "저희 동네도 비슷한 상황이에요",
    "관심 있습니다. 같이 해 보면 좋겠어요",
  ],
};

const pick = (list, n) => list[n % list.length];

// 순번에 상수를 곱해 고르면 같은 동네가 일정 간격으로 돌아올 때 주기가 겹쳐
// 한 동네에 같은 글감만 떨어짐. 섞은 값으로 골라 그 규칙성을 없앰
// 값은 순번과 동네에서만 나와 다시 실행해도 같은 글이 같은 자리에 들어감
function hash(...parts) {
  let h = 0x811c9dc5;
  for (const part of parts.join("|")) {
    h ^= part.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// 한 동네가 이미 쓴 글감. 글감 수가 5~7 개뿐이라 해시만으로는 같은 동네에 같은 글이 겹침
const usedTopics = new Map();
function pickUnused(list, start, scope) {
  const used = usedTopics.get(scope) ?? new Set();
  usedTopics.set(scope, used);
  for (let step = 0; step < list.length; step += 1) {
    const index = (start + step) % list.length;
    if (used.has(index)) continue;
    used.add(index);
    return list[index];
  }
  // 글감보다 글이 많은 동네는 어쩔 수 없이 다시 씀
  return list[start % list.length];
}

// 사진을 붙일 글의 주제, 돌봄과 동네 글은 사진 없이도 자연스러움
const PHOTO_RATE = { sighting_talk: 0.75, reunion: 0.55, care_tip: 0.3, neighborhood: 0.25 };

function photoPathFor(category, seq, pool) {
  // 주제마다 사진이 붙는 비율을 달리해 피드가 한 모양으로 보이지 않게 함
  if ((seq % 20) / 20 >= PHOTO_RATE[category]) return null;

  const candidates =
    category === "care_tip"
      ? [`pool/cat/${seq % CAT_PHOTO_COUNT}.jpg`, `pool/dog/${pick(DOG_SLUGS, seq)}-${seq % PHOTOS_PER_DOG_BREED}.jpg`]
      : seq % 7 === 3
        ? [`pool/other/${pick(OTHER_SLUGS, seq)}-${seq % PHOTOS_PER_OTHER}.jpg`]
        : seq % 2 === 0
          ? [`pool/dog/${pick(DOG_SLUGS, seq)}-${seq % PHOTOS_PER_DOG_BREED}.jpg`]
          : [`pool/cat/${seq % CAT_PHOTO_COUNT}.jpg`];

  return candidates.find((key) => pool.has(key)) ?? null;
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

const sql = postgres(DATABASE_URL, { prepare: false });

try {
  const pool = new Set([
    ...(await storageList("pool/dog/")),
    ...(await storageList("pool/cat/")),
    ...(await storageList("pool/other/")),
  ]);
  process.stdout.write(`사진 풀 ${pool.size}장 사용\n`);
  if (pool.size === 0) {
    process.stdout.write("풀이 비어 사진 없이 넣습니다, seed-nationwide 를 먼저 실행하십시오\n");
  }

  // 제보가 쓰는 동 이름을 그대로 써야 내 동네 피드가 제보와 같은 동네를 가리킴
  const dongRows = await sql`
    select split_part(area_name, ' ', 3) as dong
    from reports
    where area_name is not null and split_part(area_name, ' ', 3) <> ''
    group by 1
    order by count(*) desc
    limit 60
  `;
  const DONGS = dongRows.map((row) => row.dong);
  if (DONGS.length === 0) throw new Error("reports 에 동 이름이 없습니다");
  process.stdout.write(
    `동네 ${DONGS.length}곳 사용, 동탄·수원 ${LOCAL_DONGS.length}곳에 ${LOCAL_POST_COUNT}건 고정\n`,
  );

  // 작성자 먼저, 글이 참조하는 프로필이 없으면 카드에 이름이 비어 보임
  const authorIds = AUTHORS.map(
    (_, index) => `${AUTHOR_PREFIX}${String(index + 1).padStart(8, "0")}`,
  );
  for (const [index, author] of AUTHORS.entries()) {
    await sql`
      insert into user_profiles (id, provider, display_name, avatar_url)
      values (${authorIds[index]}, ${author.provider}, ${author.name}, null)
      on conflict (id) do update set
        provider = excluded.provider,
        display_name = excluded.display_name
    `;
  }
  process.stdout.write(`작성자 ${AUTHORS.length}명 준비\n`);

  const categories = Object.keys(TOPICS);
  const postIds = [];
  const now = Date.now();

  // 글 구성이 바뀌면 사진과 댓글 연결도 달라져 이 대역의 기존 행을 먼저 비움
  await sql`delete from community_post_photos where post_id::text like ${`${POST_PREFIX}%`}`;
  await sql`delete from community_comments where post_id::text like ${`${POST_PREFIX}%`}`;
  await sql`delete from community_post_likes where post_id::text like ${`${POST_PREFIX}%`}`;

  for (let seq = 0; seq < POST_COUNT; seq += 1) {
    const id = `${POST_PREFIX}${String(seq + 1).padStart(8, "0")}`;
    // 주제를 돌리되 목격 글이 조금 더 많게 둠, 피드 성격이 제보 쪽에 가까움
    const category = seq % 5 === 4 ? "sighting_talk" : pick(categories, seq);
    // 앞쪽을 동탄·수원에 배정하되 시각은 전체에 흩어져 피드 위쪽만 채우지 않음
    const dongIndex = seq < LOCAL_POST_COUNT ? seq * 3 : seq * 7;
    const dong =
      seq < LOCAL_POST_COUNT
        ? pick(LOCAL_DONGS, dongIndex)
        : pick(DONGS, dongIndex);
    // 같은 동네에 같은 글감이 두 번 가면 동네로 묶어 보는 화면에서 바로 티가 남
    // 해시에서 시작해 그 동네가 안 쓴 글감이 나올 때까지 한 칸씩 밀어 봄
    const topic = pickUnused(TOPICS[category], hash(seq, dong), `${dong}|${category}`);
    const authorId = pick(authorIds, seq * 5);
    // 최근 45일에 흩어 두어 목록 정렬이 한 시각에 몰리지 않게 함
    const createdAt = new Date(now - (((seq * 131) % 1080) + 1) * 3_600_000);
    const commentCount = seq % 9 === 0 ? 0 : (seq % 5) + (seq % 3);
    const likeCount = (seq * 3) % 17;

    await sql`
      insert into community_posts (
        id, author_id, category, title, body, area_name,
        comment_count, like_count, hidden, created_at, updated_at
      ) values (
        ${id}, ${authorId}, ${category},
        ${topic.title.replaceAll("{dong}", dong)},
        ${topic.body.replaceAll("{dong}", dong)},
        ${dong}, ${commentCount}, ${likeCount}, false, ${createdAt}, ${createdAt}
      )
      on conflict (id) do update set
        author_id = excluded.author_id,
        category = excluded.category,
        title = excluded.title,
        body = excluded.body,
        area_name = excluded.area_name,
        comment_count = excluded.comment_count,
        like_count = excluded.like_count,
        hidden = excluded.hidden,
        deleted_at = null,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;
    postIds.push({ id, category, createdAt, commentCount, likeCount });

    const photoPath = photoPathFor(category, seq, pool);
    if (photoPath) {
      await sql`
        insert into community_post_photos (post_id, storage_path, sort_order)
        values (${id}, ${photoPath}, 0)
      `;
    }

    if ((seq + 1) % 50 === 0) process.stdout.write(`${seq + 1}/${POST_COUNT}\n`);
  }

  // 댓글은 글에 적어 둔 comment_count 와 같은 수만큼 넣어 카드 숫자와 목록이 어긋나지 않게 함
  let commentTotal = 0;
  for (const [index, post] of postIds.entries()) {
    for (let i = 0; i < post.commentCount; i += 1) {
      const authorId = pick(authorIds, index * 3 + i + 1);
      // 글보다 뒤, 지금보다 앞에 오도록 글 시각에서 시간을 더함
      const createdAt = new Date(
        Math.min(post.createdAt.getTime() + (i + 1) * 2_700_000 + (index % 7) * 600_000, now),
      );
      await sql`
        insert into community_comments (post_id, author_id, body, created_at)
        values (${post.id}, ${authorId}, ${pick(COMMENTS[post.category], index + i)}, ${createdAt})
      `;
      commentTotal += 1;
    }
  }
  process.stdout.write(`댓글 ${commentTotal}건\n`);

  // 공감은 작성자 12명이라 like_count 를 그대로 채울 수 없어 가능한 만큼만 넣음
  // 카드가 보여 주는 숫자는 community_posts.like_count 라 표시는 그대로 유지됨
  let likeTotal = 0;
  for (const [index, post] of postIds.entries()) {
    const count = Math.min(post.likeCount, authorIds.length);
    for (let i = 0; i < count; i += 1) {
      await sql`
        insert into community_post_likes (post_id, user_id, created_at)
        values (${post.id}, ${pick(authorIds, index + i)}, ${post.createdAt})
        on conflict do nothing
      `;
      likeTotal += 1;
    }
  }
  process.stdout.write(`공감 ${likeTotal}건\n`);

  const summary = await sql`
    select category, count(*)::int as count,
      count(*) filter (where exists (
        select 1 from community_post_photos p where p.post_id = community_posts.id
      ))::int as with_photo
    from community_posts where id::text like ${`${POST_PREFIX}%`} group by 1 order by 1
  `;
  process.stdout.write(`\n커뮤니티 글 ${postIds.length}건을 넣었습니다\n`);
  for (const row of summary) {
    process.stdout.write(`  ${row.category} ${row.count}건, 사진 ${row.with_photo}건\n`);
  }
  process.stdout.write(
    `지우려면 delete from community_posts where id::text like '${POST_PREFIX}%'\n` +
      `           delete from user_profiles where id::text like '${AUTHOR_PREFIX}%'\n`,
  );
} finally {
  await sql.end();
}
