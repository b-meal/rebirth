# REBIRTH 디자인 시스템

`apps/web` 의 UI 단일 원천은 당근 SEED 하나입니다. 자체 디자인 시스템을 만들지 않고, 값과 컴포넌트를 모두 SEED 에서 가져옵니다. `apps/admin` 은 Montage 를 그대로 쓰며 이 문서의 대상이 아닙니다.

`.claude/hooks/enforce-design-system.mjs` 가 PreToolUse 에서 `apps/web/**/*.tsx` 의 하드코딩과 다른 UI 라이브러리 유입을 차단합니다. 값을 눈으로 확인하려면 `pnpm dev` 후 `/design` 을 엽니다.

## 원천

| 대상 | 위치 |
|---|---|
| 컴포넌트 | `apps/web/seed-design/ui/*` |
| 유틸 스니펫 | `apps/web/seed-design/lib/*`, `apps/web/seed-design/breeze/*` |
| 레이아웃과 타이포 | `@seed-design/react` 의 `Box` `Flex` `VStack` `HStack` `Grid` `Text` |
| 토큰 | `@seed-design/css/vars` 의 `$color` `$dimension` `$radius` `$shadow` |
| 아이콘 | `@karrotmarket/react-monochrome-icon`, `@karrotmarket/react-multicolor-icon` |
| 전역 CSS | `@seed-design/css/all.css`, `app/layout.tsx` 에서 한 번만 import |
| 앱 전용 껍데기 | `apps/web/components/ui/*` |

`apps/web/seed-design/**` 은 SEED CLI 가 내려받은 원본 스니펫입니다. 직접 고치지 않고 CLI 로 갱신합니다. 훅과 eslint 는 이 디렉터리를 검사에서 제외합니다.

## 설치와 갱신

##### 새 컴포넌트 내려받기

```bash
pnpm --filter @rebirth/web exec npx @seed-design/cli@latest add ui:<이름>
```

##### 항목 목록 확인

```bash
curl -sL https://seed-design.io/__registry__/react/ui/index.json
```

설정은 `apps/web/seed-design.json` 이고 `rsc: true` 라 스니펫의 `"use client"` 가 보존됩니다. 경로 별칭 `seed-design/*` 는 `apps/web/tsconfig.json` 에 있습니다.

## 원칙

| 원칙 | 내용 |
|---|---|
| SEED 단일 원천 | 없는 컴포넌트는 손으로 만들지 않고 SEED 레지스트리에서 먼저 찾음 |
| 모바일 전용 | 390px 프레임 하나만 설계하고 데스크톱에서는 가운데에 가둠 |
| 색은 역할 토큰 | `fg` `bg` `stroke` 로만 부르고 `palette` 는 예외적인 고정색에만 씀 |
| 듀얼 테마 | 색 모드는 `html` 의 `data-seed-color-mode` 로만 제어 |
| 단일 서체 | SEED 는 서체를 정하지 않으므로 앱에서 Pretendard 하나로 고정 |
| 간격은 x 눈금 | `x0_5` 부터 `x16`, 화면 여백은 `spacingX.globalGutter` |
| 앱 껍데기 분리 | 프레임과 화면 레이아웃만 `components/ui` 에 두고 나머지는 SEED |

## 색 토큰

| 묶음 | 용도 |
|---|---|
| `fg.neutral` | 본문과 제목 |
| `fg.neutralMuted` | 보조 설명과 부제 |
| `fg.neutralSubtle` | 가장 옅은 안내 문구 |
| `fg.brand` | 브랜드 색 글자와 아이콘 |
| `fg.critical` `fg.warning` `fg.positive` `fg.informative` | 상태 문구 |
| `bg.layerDefault` | 화면과 카드 바탕 |
| `bg.layerBasement` | 화면 아래 깔리는 바탕, 데스크톱 프레임 밖 |
| `bg.layerFloating` | 떠 있는 면, 시트와 팝오버 |
| `bg.brandSolid` `bg.brandWeak` | 주 동작 바탕 |
| `bg.neutralWeak` `bg.neutralSolid` | 회색 단계 바탕 |
| `stroke.neutralMuted` | 구분선과 기본 테두리 |
| `stroke.focusRing` | 포커스 링 |
| `palette.*` | 브랜드와 무관한 고정색, 남용 금지 |

전체 목록은 `/design` 의 색 절에서 실제 값과 함께 확인합니다. 목록을 문서에 복사해 두지 않습니다.

## 타이포그래피

`Text` 의 `textStyle` 로만 부릅니다. `t1` 이 가장 작고 `t14` 가 가장 큽니다. 굵기는 `Regular` `Medium` `Bold` 세 가지입니다.

| 자리 | 값 |
|---|---|
| 화면 제목 | `screenTitle` |
| 화면 안 큰 제목 | `t8Bold` |
| 절 제목 | `t7Bold` `t6Bold` |
| 항목 제목 | `t5Bold` |
| 본문 | `t5Regular` `t4Regular` |
| 긴 글 본문 | `articleBody` |
| 보조 문구 | `t3Regular` |
| 가장 작은 문구 | `t2Regular` `t1Regular` |

폰트 스케일링에 반응하지 않아야 하는 자리만 `t5StaticRegular` 처럼 `Static` 계열을 씁니다.

## 간격과 모서리와 그림자

| 종류 | 값 |
|---|---|
| 간격 | `x0_5` `x1` `x1_5` `x2` `x2_5` `x3` `x3_5` `x4` `x4_5` `x5` `x6` `x7` `x8` `x9` `x10` `x12` `x13` `x14` `x16` |
| 화면 좌우 여백 | `spacingX.globalGutter` |
| 칩 사이 | `spacingX.betweenChips` |
| 컴포넌트 사이 | `spacingY.componentDefault` |
| 문단 사이 | `spacingY.betweenText` |
| 화면 아래 | `spacingY.screenBottom` |
| 모서리 | `r0_5` `r1` `r1_5` `r2` `r2_5` `r3` `r3_5` `r4` `r5` `r6` `full` |
| 그림자 | `s1` `s2` `s3` |

## 앱 전용 껍데기

SEED 가 제공하지 않고 이 앱에만 필요한 것만 `apps/web/components/ui` 에 둡니다.

| 파일 | 이유 |
|---|---|
| `app-frame.tsx` | 데스크톱에서 390px 프레임에 가두는 앱 껍데기 |
| `screen.tsx` | 화면 루트와 본문 여백을 SEED 토큰으로 한 번만 정의 |
| `error-view.tsx` | 오프라인과 요청 번호를 함께 다루는 오류 화면 |
| `photo-field.tsx` | 압축 업로드 훅과 SEED ImageFrame 을 잇는 사진 입력 |
| `photo-picker-input.tsx` | 후면 카메라 즉시 실행에 필요한 네이티브 file 입력 |
| `place-search-field.tsx` | 카카오 장소 검색 결과를 SEED List 로 겹쳐 띄우는 검색창 |

새 화면을 만들 때 이 목록에 없는 것이 필요하면, 먼저 SEED 레지스트리를 확인하고 없을 때만 여기에 추가합니다.

## 하지 않는 것

| 금지 | 대신 |
|---|---|
| 색 여백 글자 크기를 코드에 직접 적기 | SEED 토큰 이름으로 부르기 |
| `@chakra-ui/react` 같은 다른 UI 라이브러리 | `@seed-design/react` 와 `seed-design/ui` |
| Tailwind 유틸리티 클래스 | SEED 컴포넌트 props 와 `Box` 스타일 prop |
| 원시 `<button>` `<input>` `<select>` `<textarea>` | `ActionButton` `TextField` `Select` `Checkbox` `Switch` |
| `apps/web/seed-design/**` 직접 수정 | CLI 로 갱신하고 필요하면 감싸는 컴포넌트를 밖에 만들기 |
| deprecated 항목 사용 | `/react/llms.txt` 에서 현재 항목 확인 |

값 자체가 내용이라 예외가 필요하면 파일 맨 위에 사유와 함께 표시합니다.

```tsx
// design-system-allow:raw-element 카메라 즉시 실행에 네이티브 file 입력이 필요함
```

규칙 id 는 `color` `space` `type` `radius` `shadow` `raw-element` `source` 입니다.

## 문서 찾기

SEED 문서는 llms.txt 로 제공되며 목록이 곧 단일 원천입니다. 경로를 기억으로 조합하지 않고 인덱스를 먼저 읽습니다.

| 인덱스 | 주소 |
|---|---|
| 전체 | `https://seed-design.io/llms.txt` |
| React | `https://seed-design.io/react/llms.txt` |
| 컴포넌트 스펙 | `https://seed-design.io/components/llms.txt` |
| 파운데이션 | `https://seed-design.io/foundations/llms.txt` |

`seed-docs` MCP 서버가 `.mcp.json` 에 등록돼 있어 `list_react_components` `get_react_component` `search_icons` 로도 같은 내용을 조회할 수 있습니다. `.claude/skills/seed-design` 스킬이 라우팅 절차를 안내합니다.
