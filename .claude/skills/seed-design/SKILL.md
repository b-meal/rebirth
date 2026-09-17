---
name: seed-design
description: apps/web 의 화면과 컴포넌트를 만들거나 고칠 때 SEED 공식 문서와 설치된 스니펫을 찾는 절차. SEED 컴포넌트 사용법, props, 토큰 이름, 아이콘 검색, 새 스니펫 설치, deprecated 확인이 필요할 때 사용. "SEED 로 만들어줘", "이 컴포넌트 어떻게 써", "토큰 이름 뭐야", "아이콘 찾아줘" 에 해당.
user-invocable: true
argument-hint: "[컴포넌트 이름 또는 질문]"
---

# SEED Design

`apps/web` 의 UI 단일 원천은 당근 SEED 입니다. 문서 내용을 이 파일에 복사하지 않고, 공식 인덱스와 저장소에 설치된 실물을 원본으로 씁니다.

## 1. 저장소에 있는 것부터 확인

문서를 뒤지기 전에 이미 설치된 것을 봅니다. 여기 있으면 그대로 씁니다.

| 확인할 것 | 위치 |
|---|---|
| 설치된 컴포넌트 목록 | `ls apps/web/seed-design/ui` |
| 컴포넌트의 실제 props | `apps/web/seed-design/ui/<이름>.tsx` 의 `export interface` |
| 레이아웃과 타이포 props | `node_modules/@seed-design/react/lib/components/<이름>/*.d.ts` |
| 토큰 이름과 값 | `node_modules/@seed-design/css/vars/index.mjs` |
| 변형 목록 | `node_modules/@seed-design/css/recipes/<이름>.d.ts` |
| 앱 전용 껍데기 | `apps/web/components/ui` |
| 규칙 전문 | `.claude/DESIGN.md` |

`apps/web/seed-design/**` 은 CLI 가 내려받은 원본입니다. 직접 고치지 않습니다.

## 2. 문서 라우팅

설치된 파일로 답이 안 나오면 공식 인덱스를 읽습니다. 경로를 기억으로 조합하지 않고 인덱스가 준 링크만 따라갑니다.

1. 전체 인덱스 `https://seed-design.io/llms.txt`
2. React 인덱스 `https://seed-design.io/react/llms.txt`
3. 인덱스가 준 leaf 주소를 열어 실제 계약을 읽음

`seed-docs` MCP 서버가 붙어 있으면 같은 내용을 도구로 조회할 수 있습니다.

| 목적 | 도구 |
|---|---|
| 컴포넌트 목록 | `list_react_components` |
| 컴포넌트 문서 | `get_react_component` |
| 디자인 가이드라인 | `get_docs_component` |
| 토큰 원본 | `get_rootage` |
| 아이콘 검색 | `search_icons`, `get_icon_details` |

인덱스를 정상적으로 읽었는데 항목이 없으면 그 컴포넌트가 SEED 에 없다고 판단합니다. 인덱스 자체를 못 읽었으면 부재로 확정하지 않습니다.

## 3. 없는 컴포넌트가 필요할 때

손으로 만들기 전에 레지스트리를 먼저 봅니다.

```bash
curl -sL https://seed-design.io/__registry__/react/ui/index.json
```

있으면 내려받습니다.

```bash
pnpm --filter @rebirth/web exec npx @seed-design/cli@latest add ui:<이름>
```

레지스트리에도 없고 이 앱에만 필요한 것이면 `apps/web/components/ui` 에 SEED 토큰과 프리미티브만으로 만들고 `.claude/DESIGN.md` 의 표에 한 줄 추가합니다.

`app-screen` 과 `attachment-*-reorderable` 은 각각 stackflow 와 dnd-kit 을 끌어오므로 설치하지 않았습니다. 필요해지면 의존성 추가 여부를 먼저 확인합니다.

## 4. 코드 작성 규칙

- 색 여백 글자 크기 모서리 그림자를 코드에 직접 적지 않고 토큰 이름으로 부릅니다.
- `Text` 는 스타일 prop 을 받지 않습니다. 여백이 필요하면 `Box` 나 `VStack` 으로 감쌉니다.
- `ActionButton` 은 `width` 를 받지 않습니다. 꽉 채우려면 부모를 `align="stretch"` 로 둡니다.
- `bg` `borderWidth` 같은 일부 prop 은 반응형 객체를 받지 않습니다. 타입을 먼저 확인합니다.
- 원시 `<button>` `<input>` `<select>` `<textarea>` 를 쓰지 않습니다.
- deprecated 항목은 `/react/llms.txt` 의 표시로 확인하고 쓰지 않습니다.
- 값 자체가 내용이라 예외가 필요하면 파일 맨 위에 `design-system-allow:<규칙id>` 와 사유를 적습니다.

## 5. 검증

변경 뒤 아래를 실행하고, 값을 눈으로 볼 때는 `/design` 을 엽니다.

```bash
pnpm lint
pnpm typecheck
pnpm build
```
