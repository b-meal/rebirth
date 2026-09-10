# REBIRTH 디자인 시스템

값과 컴포넌트의 단일 원천은 `apps/web/lib/theme.ts` 와 `apps/web/components/ui` 입니다. 화면 코드에 색, 여백, 글자 크기를 직접 적지 않습니다. 필요한 것이 없으면 여기에 먼저 추가한 뒤 씁니다.

`.claude/hooks/enforce-design-system.mjs` 가 PreToolUse 에서 `apps/web/**/*.tsx` 의 하드코딩을 차단합니다. 값을 눈으로 확인하려면 `pnpm dev` 후 `/design` 을 엽니다.

## 원칙

| 원칙 | 내용 |
|---|---|
| 모바일 전용 | 390px 프레임 하나만 설계하고 데스크톱에서는 가운데에 가둠 |
| 포인트 색 단일 원천 | `POINT` 하나가 brand 단계, 틴트 회색, 배경, 그림자를 모두 파생 |
| 터치 최소 44px | 누르는 요소는 아이콘만 있어도 높이 44px 이상 확보 |
| 여백 네 단계 | screen 20, section 32, block 16, inline 8 밖의 값을 쓰지 않음 |
| 단일 서체 | Pretendard 하나, 숫자는 tabular 로 자리를 맞춤 |
| 듀얼 테마 | 색은 semantic token 으로만 부르고 라이트와 다크가 함께 따라옴 |
| 모서리 세 단계 | control 12, card 16, sheet 24 로 요소의 크기와 무게를 나눔 |

## 포인트 색

`apps/web/lib/theme.ts` 의 `POINT` 한 값을 바꾸면 brand 11단계, 틴트 회색 11단계, 배경 3단계, 그림자가 함께 다시 계산됩니다.

##### 포인트 색 변경

```ts
export const POINT = { hue: 92, chroma: 0.14 } as const;
```

| 색 | hue |
|---|---|
| 노란색 | 92 |
| 살구 | 60 |
| 민트 | 165 |
| 라벤더 | 300 |

## 색 토큰

색은 semantic token 이름으로만 부릅니다. `brand.500` 같은 단계값은 토큰을 정의할 때만 씁니다.

| 이름 | 용도 |
|---|---|
| `brand.solid` | 주 동작 버튼 바탕 |
| `brand.contrast` | `brand.solid` 위 글자 |
| `brand.fg` | 브랜드 색 글자와 아이콘 |
| `brand.muted` | 활성 탭 알약, 아이콘 원 |
| `brand.subtle` | 배너와 강조 상자 바탕 |
| `brand.emphasized` | 브랜드 테두리 |
| `brand.focusRing` | 포커스 링 |
| `bg.canvas` | 화면 바탕 |
| `bg.panel` | 카드, 시트, 다이얼로그 바탕 |
| `bg.subtle` | 입력 상자, 코드 블록 바탕 |
| `bg.alternative` | 지도 상자, 데스크톱 프레임 밖 |
| `bg.muted`, `bg.emphasized` | 회색 단계 바탕 |
| `fg.default` | 본문과 제목 |
| `fg.alternative` | 보조 설명과 부제 |
| `fg.assistive` | 가장 옅은 안내 문구 |
| `fg.error` | 오류 문구 |
| `border` | 기본 테두리 |
| `border.muted` | 구분선과 옅은 테두리 |
| `border.emphasized` | 강조 테두리 |

상태 색은 Chakra 팔레트를 그대로 씁니다. 오류 `red`, 성공 `green`, 안내 `blue`, 주의 `orange` 이며 `red.solid` `red.fg` `red.subtle` 형태로 부릅니다.

동물 털색은 브랜드와 무관한 사물 색이라 별도 눈금 `coat.white` `coat.brown` `coat.black` `coat.gray` `coat.yellow` `coat.calico` 로 둡니다. hex 원문이 필요하면 `COAT_COLORS` 를 import 합니다.

## 타이포그래피

`textStyle` 이름으로만 부르고 `fontSize` 와 `fontWeight` 를 직접 적지 않습니다.

| 이름 | 크기 / 행간 / 굵기 | 용도 |
|---|---|---|
| `display` | 32 / 40 / 700 | 화면 대표 제목 |
| `title1` | 26 / 34 / 700 | 페이지 제목 |
| `title2` | 22 / 30 / 700 | 절 제목 |
| `title3` | 18 / 26 / 600 | 묶음 제목, 카드 제목 |
| `heading` | 16 / 24 / 600 | 상단 바 제목, 목록 제목 |
| `body` | 16 / 24 / 400 | 본문 |
| `bodyStrong` | 16 / 24 / 500 | 본문 강조 |
| `bodySm` | 14 / 20 / 400 | 보조 설명 |
| `label` | 14 / 20 / 500 | 입력 라벨, 예시 제목 |
| `caption` | 12 / 16 / 400 | 시각, 개수, 각주 |
| `overline` | 11 / 14 / 600 | 분류 머리말 |
| `counter` | 10 / 12 / 700 | 배지 안 숫자 |

## 여백과 크기

여백은 네 단계 의미 토큰과 Chakra 숫자 눈금을 씁니다. px 을 직접 적지 않습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `screen` | 20px | 화면 좌우 여백 |
| `section` | 32px | 절과 절 사이 |
| `block` | 16px | 블록과 블록 사이 |
| `inline` | 8px | 칩, 아이콘, 글자 사이 |
| `safeTop` | `env(safe-area-inset-top)` | 노치 영역 |
| `safeBottom` | `env(safe-area-inset-bottom)` | 홈 인디케이터 영역 |

| 크기 토큰 | 값 | 대상 |
|---|---|---|
| `frame` | 390px | 모바일 프레임 폭 |
| `appBar` | 56px | 상단 바 높이 |
| `tabBar` | 60px | 하단 탭 바 높이 |
| `touch` | 44px | 최소 터치 영역 |
| `fab` | 56px | 떠 있는 버튼 지름 |
| `handle` | 36px | 시트 손잡이 폭 |

## 모서리와 그림자

| 토큰 | 값 | 대상 |
|---|---|---|
| `control` | 12px | 버튼, 입력, 작은 상자 |
| `card` | 16px | 카드, 예시 상자 |
| `sheet` | 24px | 바텀시트 상단, 다이얼로그 |
| `full` | 원형 | 칩, 배지, 아바타, FAB |

그림자는 세 개뿐이며 잉크색 알파로 그립니다. 회색 그림자는 틴트 배경에서 탁해집니다.

| 토큰 | 대상 |
|---|---|
| `raised` | 살짝 떠 보이는 카드 |
| `float` | FAB, 다이얼로그, 검색 결과 |
| `overlay` | 아래에서 올라오는 시트 |

## 컴포넌트

`apps/web/components/ui` 에 있는 것만 씁니다. 없으면 여기에 만들고 `apps/web/components/design/registry.ts` 에 절을 등록한 뒤 카탈로그에 예시를 넣습니다.

| 파일 | 컴포넌트 |
|---|---|
| `screen.tsx` | `Screen` `ScreenBody` `Section` `ScrollRow` `Bleed` `FRAME_OVERLAY` `FRAME_COLUMN` |
| `app-bar.tsx` | `AppBar` `AppBarAction` |
| `tab-bar.tsx` | `TabBar` |
| `cta-bar.tsx` | `CtaBar` |
| `fab.tsx` | `Fab` |
| `page-header.tsx` | `PageHeader` |
| `section-header.tsx` | `SectionHeader` |
| `list-item.tsx` | `ListGroup` `ListItem` |
| `bottom-sheet.tsx` | `BottomSheet` |
| `action-sheet.tsx` | `ActionSheet` |
| `alert-dialog.tsx` | `AlertDialog` |
| `menu-drawer.tsx` | `MenuDrawer` |
| `search-bar.tsx` | `SearchBar` |
| `step-progress.tsx` | `StepProgress` |
| `page-indicator.tsx` | `PageIndicator` |
| `banner.tsx` | `Banner` |
| `section-message.tsx` | `SectionMessage` |
| `empty-state.tsx` | `EmptyState` |
| `result-view.tsx` | `ResultView` |
| `error-view.tsx` | `ErrorView` |
| `chip.tsx` | `Chip` |
| `field.tsx` | `Field` |
| `segmented.tsx` | `Segmented` |
| `icons.tsx` | `Icon` 70종, `ICON_NAMES` |
| `toaster.tsx` | `toaster` |

폼 요소는 Chakra 의 `Input` `Textarea` `NativeSelect` `Checkbox` `RadioGroup` `Switch` 를 쓰고 원시 `<input>` `<select>` `<textarea>` 를 쓰지 않습니다. 버튼은 Chakra `Button` `IconButton` 이며 다른 태그가 필요하면 `asChild` 로 감쌉니다.

## 오버레이 배치

데스크톱에서도 오버레이는 폰 폭 안에 떠야 합니다. Positioner 의 `insetInline` 은 레시피의 `width: 100%` 와 겹쳐 무시되므로 쓰지 않습니다.

| 상황 | 방법 |
|---|---|
| 가운데 또는 아래에서 올라오는 것 | Content 에 `{...FRAME_OVERLAY}` 를 펼침 |
| 가장자리에 붙는 옆 메뉴 | Positioner 에 `{...FRAME_COLUMN}` 을 펼침 |

전역 CSS 의 `overflow-x` 는 `hidden` 이 아니라 `clip` 입니다. `hidden` 은 스크롤 컨테이너를 만들어 `position: sticky` 를 무력화합니다.

## 하드코딩 금지

훅이 막는 항목입니다. 위반하면 도구 호출 단계에서 차단됩니다.

| 규칙 id | 차단 대상 | 대신 쓸 것 |
|---|---|---|
| `color` | `#rrggbb`, `rgb()`, `hsl()`, `oklch()` | semantic 색 토큰 |
| `space` | `padding` `margin` `gap` `inset` 의 px, rem | 여백 토큰과 Chakra 눈금 |
| `type` | `fontSize` `fontWeight` `lineHeight` 리터럴, 정의하지 않은 `textStyle` | `textStyle` 이름 |
| `radius` | `borderRadius` 의 px, rem | `control` `card` `sheet` `full` |
| `shadow` | `boxShadow` 원시값, 정의하지 않은 이름 | `raised` `float` `overlay` |
| `raw-element` | `<input>` `<select>` `<textarea>`, `asChild` 없는 `<button>` | Chakra 컴포넌트 |

`apps/web/lib/theme.ts` 와 이미지 생성 라우트는 검사 대상이 아닙니다. 값 자체가 내용이라 예외가 필요하면 파일 맨 위에 사유와 함께 표시합니다.

##### 예외 표시

```ts
// design-system-allow:color 캔버스 픽셀 값이라 CSS 토큰을 쓸 수 없음
```

## 제품 언어

| 금지 | 사용 |
|---|---|
| 유기동물 판별 | 발견동물 제보 |
| 말티즈 | 흰색 소형견, 말티즈 계열 추정 |
| 동일 개체 확정 | 확인할 후보 |
| AI 진단 | AI 초안, 수정 가능 |

정확 좌표는 공개 API 응답, UI, 공유 카드 어디에도 넣지 않고 행정동까지만 표시합니다. 목격 시각은 절대 시각으로 적고 상대 시간은 목록에서만 씁니다.

## 카탈로그

`/design` 은 데스크톱에서 보는 내부 화면입니다. 좌측 내비에서 고른 절 하나만 본문에 그리고, 컴포넌트 예시는 데스크톱에서도 390px 폭으로 보여 실제 모바일 줄바꿈을 그대로 확인합니다.

| 분류 | 절 |
|---|---|
| Foundations | 8 |
| Elements | 14 |
| Forms | 26 |
| Overlays | 15 |
| Navigation | 13 |
| Data Display | 17 |
| Feedback | 9 |
| Charts | 5 |
| Layout | 7 |
| Shells | 13 |

절을 추가하려면 `registry.ts` 에 id 와 라벨을 넣고 해당 `catalog-*.tsx` 에 같은 id 의 `Spec` 을 같은 순서로 둡니다. 두 곳이 어긋나면 카탈로그에 빈 화면이 나옵니다.
