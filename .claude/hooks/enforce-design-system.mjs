#!/usr/bin/env node
// apps/web 의 UI 단일 원천은 SEED, 토큰 이름은 설치된 @seed-design/css 에서 읽음

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TARGET_DIR = 'apps/web';

// SEED CLI 가 내려받은 원본 스니펫과 이미지 생성 라우트는 검사 제외
const EXEMPT_PREFIX = 'apps/web/seed-design/';
const EXEMPT_ROUTE = /apps\/web\/app\/.*route\.tsx?$/;

// UI 를 가져올 수 있는 출처, 나머지 컴포넌트 라이브러리는 차단 대상
const ALLOWED_UI_PREFIX = [
  '@seed-design/',
  'seed-design/',
  '@karrotmarket/react-monochrome-icon',
  '@karrotmarket/react-multicolor-icon',
  '@rebirth/',
  'next/',
  '@/',
];
const ALLOWED_UI_EXACT = ['react', 'react-dom', 'next'];

const BANNED_IMPORTS = [
  '@chakra-ui/react',
  '@emotion/react',
  '@emotion/styled',
  '@emotion/cache',
  '@wanteddev/wds',
  '@wanteddev/wds-icon',
  'class-variance-authority',
  'tailwind-merge',
  '@radix-ui/themes',
  '@mui/material',
  'antd',
];

// exports 맵이 import 조건만 정의해 package.json 위치에서 실제 파일 경로를 조립
function loadSeedTokens(webDir) {
  const require = createRequire(path.join(webDir, 'package.json'));
  const root = path.dirname(require.resolve('@seed-design/css/package.json'));
  return {
    varsUrl: pathToFileURL(path.join(root, 'vars', 'index.mjs')).href,
    textTypes: path.join(root, 'recipes', 'text.d.ts'),
  };
}

function collect(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' ? collect(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function allowedRules(source) {
  const allowed = new Set();
  for (const match of source.matchAll(/design-system-allow:([\w,-]+)/g)) {
    for (const id of match[1].split(',')) allowed.add(id.trim());
  }
  return allowed;
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const tool = input.tool_name ?? '';
if (tool !== 'Write' && tool !== 'Edit') process.exit(0);

const params = input.tool_input ?? {};
const cwd = input.cwd ?? process.cwd();
const raw = params.file_path ?? '';
if (!raw) process.exit(0);

const absolute = path.resolve(cwd, raw);
const rel = path.relative(cwd, absolute).split(path.sep).join('/');
if (!rel.startsWith(`${TARGET_DIR}/`)) process.exit(0);
if (!/\.(tsx|ts)$/.test(rel)) process.exit(0);
if (rel.startsWith(EXEMPT_PREFIX) || EXEMPT_ROUTE.test(rel)) process.exit(0);

const text = tool === 'Write' ? (params.content ?? '') : (params.new_string ?? '');
if (!text.trim()) process.exit(0);

// Edit 은 바뀌는 조각만 오므로 예외 표시는 디스크의 파일 전체에서 탐색
let existing = '';
try {
  existing = readFileSync(absolute, 'utf8');
} catch {
  existing = '';
}
const allowed = allowedRules(`${text}\n${existing}`);

let vars;
let textStyles = [];
try {
  const webDir = path.join(cwd, TARGET_DIR);
  const { varsUrl, textTypes } = loadSeedTokens(webDir);
  ({ vars } = await import(varsUrl));
  const declaration = readFileSync(textTypes, 'utf8');
  const union = declaration.match(/\n\s*textStyle:\s*([^;]+);/);
  if (union) textStyles = [...union[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
} catch {
  // 토큰을 못 읽으면 이름 검사만 건너뛰고 리터럴 검사는 계속 수행
}

const colorNames = vars
  ? new Set([
      ...collect(vars.$color.fg, 'fg.'),
      ...collect(vars.$color.bg, 'bg.'),
      ...collect(vars.$color.stroke, 'stroke.'),
      ...collect(vars.$color.palette, 'palette.'),
    ])
  : null;
const dimensionNames = vars ? new Set(collect(vars.$dimension)) : null;
const radiusNames = vars ? new Set(Object.keys(vars.$radius)) : null;
const shadowNames = vars ? new Set(Object.keys(vars.$shadow)) : null;

const findings = [];
const push = (id, message, hits) => {
  if (allowed.has(id)) return;
  findings.push(`[${id}] ${message}\n  발견: ${[...new Set(hits)].slice(0, 6).join(', ')}`);
};

// 색 리터럴, & 로 시작하는 HTML 엔티티는 색이 아니라 제외
const colorLiterals = [
  ...text.matchAll(/(?<![&\w])#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/g),
].map((m) => m[0]);
if (colorLiterals.length) {
  push('color', '색을 직접 적었습니다. fg bg stroke palette 토큰으로 부르십시오', colorLiterals);
}

// 여백 리터럴
const spaceLiterals = [
  ...text.matchAll(
    /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|rowGap|columnGap|padding|margin)[A-Za-z]*=\{?"-?[\d.]+(?:px|rem|em)"/g,
  ),
].map((m) => m[0]);
if (spaceLiterals.length) {
  push('space', '여백을 직접 적었습니다. x1 x2 spacingX spacingY 토큰을 쓰십시오', spaceLiterals);
}

// 글자 리터럴
const typeLiterals = [
  ...text.matchAll(
    /\bfontSize=\{?"[\d.]+(?:px|rem|em)"|\bfontWeight=\{?"(?:\d{3}|bold|normal)"|\blineHeight=\{?"[\d.]+(?:px|rem)"/g,
  ),
].map((m) => m[0]);
if (typeLiterals.length) {
  push('type', '글자 크기와 굵기를 직접 적었습니다. textStyle 로 부르십시오', typeLiterals);
}

// 모서리와 그림자 리터럴
const radiusLiterals = [...text.matchAll(/\bborderRadius=\{?"[\d.]+(?:px|rem|em|%)"/g)].map(
  (m) => m[0],
);
if (radiusLiterals.length) {
  push('radius', '모서리를 직접 적었습니다. r0_5 r1 r2 r3 r4 r5 r6 full 을 쓰십시오', radiusLiterals);
}
const shadowLiterals = [...text.matchAll(/\bboxShadow=\{?"[^"]*(?:px|rgba?\()[^"]*"/g)].map(
  (m) => m[0],
);
if (shadowLiterals.length) {
  push('shadow', '그림자를 직접 적었습니다. s1 s2 s3 을 쓰십시오', shadowLiterals);
}

// SEED 에 없는 토큰 이름
if (textStyles.length) {
  const bad = [...text.matchAll(/\btextStyle=\{?"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((name) => !textStyles.includes(name));
  if (bad.length) {
    push('type', 'SEED 에 없는 textStyle 입니다. t1Regular 부터 t14Bold 사이에서 고르십시오', bad);
  }
}
if (colorNames) {
  const bad = [
    ...text.matchAll(/\b(?:color|bg|background|backgroundColor|borderColor)=\{?"([a-z][\w.]*)"/g),
  ]
    .map((m) => m[1])
    .filter((name) => name.includes('.') && !colorNames.has(name));
  if (bad.length) {
    push('color', 'SEED 에 없는 색 토큰입니다. fg bg stroke palette 중에서 고르십시오', bad);
  }
}
if (dimensionNames) {
  const bad = [
    ...text.matchAll(
      /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|rowGap|columnGap)=\{?"([a-z][\w.]*)"/g,
    ),
  ]
    .map((m) => m[1])
    .filter((name) => name !== 'auto' && name !== 'safeArea' && !dimensionNames.has(name));
  if (bad.length) {
    push('space', 'SEED 에 없는 간격 토큰입니다. x0_5 부터 x16, spacingX, spacingY 만 유효', bad);
  }
}
if (radiusNames) {
  const bad = [...text.matchAll(/\bborderRadius=\{?"([a-z][\w.]*)"/g)]
    .map((m) => m[1])
    .filter((name) => !radiusNames.has(name));
  if (bad.length) push('radius', 'SEED 에 없는 모서리 토큰입니다', bad);
}
if (shadowNames) {
  const bad = [...text.matchAll(/\bboxShadow=\{?"([a-z][\w.]*)"/g)]
    .map((m) => m[1])
    .filter((name) => name !== 'none' && !shadowNames.has(name));
  if (bad.length) push('shadow', 'SEED 에 없는 그림자 토큰입니다. s1 s2 s3 만 유효', bad);
}

// 원시 폼 요소와 손수 만든 버튼
const rawElements = [...text.matchAll(/<(?:input|select|textarea)[\s/>]/g)].map((m) => m[0]);
if (rawElements.length) {
  push(
    'raw-element',
    '원시 폼 요소를 썼습니다. seed-design/ui 의 TextField Select Checkbox Switch 로 대체',
    rawElements,
  );
}
if (
  !allowed.has('raw-element') &&
  /<button[\s>]/.test(text) &&
  !/asChild/.test(`${text}${existing}`)
) {
  findings.push(
    '[raw-element] 버튼을 직접 만들었습니다\n  seed-design/ui 의 ActionButton 을 쓰고 다른 태그는 asChild 로 감싸십시오',
  );
}

// 다른 UI 라이브러리 유입
const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
const banned = imports.filter((source) =>
  BANNED_IMPORTS.some((name) => source === name || source.startsWith(`${name}/`)),
);
if (banned.length) {
  push('source', 'apps/web 의 UI 는 SEED 하나, 다른 UI 라이브러리는 반입 불가', banned);
}
const foreign = imports.filter(
  (source) =>
    !source.startsWith('.') &&
    /^[@a-z]/.test(source) &&
    !ALLOWED_UI_EXACT.includes(source) &&
    !ALLOWED_UI_PREFIX.some((prefix) => source.startsWith(prefix)) &&
    /(?:ui|design|icon|theme|style|css|emotion|chakra|mui|antd|radix)/i.test(source),
);
if (foreign.length) {
  push('source', 'UI 는 @seed-design/react 와 seed-design 스니펫에서만 가져오는 것이 기준', foreign);
}

// Tailwind 유틸리티 클래스 유입
if (
  !allowed.has('source') &&
  /className=["'][^"']*\b(flex|grid|gap-\d|p-\d|px-\d|py-\d|m-\d|mt-\d|text-(xs|sm|base|lg|xl)|font-(medium|semibold|bold)|rounded|border|bg-|w-full|min-h-)/.test(
    text,
  )
) {
  findings.push(
    '[source] Tailwind 유틸리티 클래스를 썼습니다\n  SEED 컴포넌트의 props 나 Box 의 스타일 prop 으로 대체하십시오',
  );
}

if (findings.length) {
  deny(
    [
      `SEED 디자인 시스템 밖의 값을 썼습니다: ${rel}`,
      '',
      ...findings,
      '',
      '없는 것을 만들어 쓰지 말고 SEED 에서 먼저 찾으십시오.',
      '  컴포넌트: apps/web/seed-design/ui 아래의 공식 스니펫',
      '  레이아웃: @seed-design/react 의 Box Flex VStack HStack Grid Text',
      '  토큰: @seed-design/css/vars 의 $color $dimension $radius $shadow',
      '  아이콘: @karrotmarket/react-monochrome-icon',
      '',
      '스니펫이 없으면 먼저 내려받으십시오.',
      '  pnpm --filter @rebirth/web exec npx @seed-design/cli@latest add ui:<이름>',
      '  목록은 https://seed-design.io/react/llms.txt 에 있습니다.',
      '',
      '규칙 전문은 .claude/DESIGN.md 이고 /design 화면에서 값을 눈으로 확인합니다.',
      '값 자체가 내용이라 예외가 필요하면 파일 맨 위에 사유와 함께 표시하십시오.',
      '  형식은 design-system-allow:<규칙id> 뒤에 한 줄 사유입니다.',
    ].join('\n'),
  );
}

process.exit(0);
