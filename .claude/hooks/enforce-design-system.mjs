#!/usr/bin/env node
// 디자인 시스템 밖 값을 막음, 토큰과 공용 컴포넌트만 쓰고 없으면 시스템에 먼저 추가

import { readFileSync } from 'node:fs';
import path from 'node:path';

const TARGET_DIR = 'apps/web';

// 토큰 원천과 이미지 생성 라우트는 토큰을 쓸 수 없어 제외
const EXEMPT = [/^apps\/web\/lib\/theme\.ts$/, /^apps\/web\/app\/.*\/route\.tsx?$/];

// lib/theme.ts 의 textStyles 와 같아야 함
const TEXT_STYLES = [
  'display',
  'title1',
  'title2',
  'title3',
  'heading',
  'body',
  'bodyStrong',
  'bodySm',
  'label',
  'caption',
  'overline',
  'counter',
];

const SHADOWS = ['raised', 'float', 'overlay', 'none'];

const RULES = [
  {
    id: 'color',
    // & 로 시작하는 HTML 엔티티는 색이 아님
    re: /(?<![&\w])#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/g,
    message: '색을 직접 적었습니다. bg fg border brand 같은 semantic 토큰으로 부르십시오',
  },
  {
    id: 'space',
    re: /\b(?:padding|margin|gap|rowGap|columnGap|inset|top|bottom|left|right)[A-Za-z]*=\{?"-?\d+(?:px|rem|em)"/g,
    message:
      '여백을 직접 적었습니다. screen section block inline 토큰이나 Chakra 숫자 눈금을 쓰십시오',
  },
  {
    id: 'type',
    re: /\bfontSize=\{?"[\d.]+(?:px|rem|em)"|\bfontWeight=\{?"(?:\d{3}|bold|normal)"|\blineHeight=\{?"[\d.]+(?:px|rem)"/g,
    message: '글자 크기와 굵기를 직접 적었습니다. textStyle 로 부르십시오',
  },
  {
    id: 'radius',
    re: /\bborderRadius=\{?"[\d.]+(?:px|rem|em)"/g,
    message: '모서리를 직접 적었습니다. control card sheet full 토큰을 쓰십시오',
  },
  {
    id: 'shadow',
    re: /\bboxShadow=\{?"(?![\w.]+"|\{)[^"]*"|\bboxShadow=\{?"[^"]*(?:px|rgba?\()[^"]*"/g,
    message: '그림자를 직접 적었습니다. raised float overlay 토큰을 쓰십시오',
  },
  {
    id: 'raw-element',
    re: /<(?:input|select|textarea)[\s/>]/g,
    message:
      '원시 폼 요소를 썼습니다. Chakra 의 Input NativeSelect Textarea 나 components/ui 의 래퍼를 쓰십시오',
  },
];

const GUIDE = [
  '',
  '없는 것을 만들어 쓰지 말고 디자인 시스템에 먼저 추가하십시오.',
  '  값이 없으면 apps/web/lib/theme.ts 의 토큰에 추가합니다.',
  '  컴포넌트가 없으면 apps/web/components/ui 에 만들고',
  '  apps/web/components/design/registry.ts 에 절을 등록한 뒤 카탈로그에 예시를 넣습니다.',
  '  규칙은 .claude/DESIGN.md 에 있고 /design 화면에서 값을 눈으로 확인합니다.',
  '',
  '값 자체가 내용이라 예외가 필요하면 파일 맨 위에 사유와 함께 표시하십시오.',
  '  형식은 design-system-allow:<규칙id> 뒤에 한 줄 사유입니다.',
].join('\n');

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
const rel = path.relative(cwd, absolute);
if (!rel.startsWith(TARGET_DIR + path.sep)) process.exit(0);
if (!/\.(tsx|ts)$/.test(rel)) process.exit(0);
if (EXEMPT.some((re) => re.test(rel))) process.exit(0);

const text = tool === 'Write' ? (params.content ?? '') : (params.new_string ?? '');
if (!text.trim()) process.exit(0);

// Edit 은 바뀌는 조각만 오므로 예외 표시는 디스크의 파일 전체에서 찾음
let existing = '';
try {
  existing = readFileSync(absolute, 'utf8');
} catch {
  existing = '';
}
const allowed = allowedRules(text + '\n' + existing);

const findings = [];
for (const rule of RULES) {
  if (allowed.has(rule.id)) continue;
  const hits = [...text.matchAll(rule.re)].map((match) => match[0]);
  if (hits.length) {
    findings.push(`[${rule.id}] ${rule.message}\n  발견: ${[...new Set(hits)].slice(0, 5).join(', ')}`);
  }
}

// 정의하지 않은 textStyle 과 shadow 이름을 막음
if (!allowed.has('type')) {
  const bad = [...text.matchAll(/\btextStyle=\{?"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !TEXT_STYLES.includes(name));
  if (bad.length) {
    findings.push(
      `[type] 시스템에 없는 textStyle 입니다\n  발견: ${[...new Set(bad)].join(', ')}\n  쓸 수 있는 이름: ${TEXT_STYLES.join(' ')}`,
    );
  }
}
if (!allowed.has('shadow')) {
  const bad = [...text.matchAll(/\bboxShadow=\{?"([\w.]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !SHADOWS.includes(name));
  if (bad.length) {
    findings.push(
      `[shadow] 시스템에 없는 그림자입니다\n  발견: ${[...new Set(bad)].join(', ')}\n  쓸 수 있는 이름: ${SHADOWS.join(' ')}`,
    );
  }
}

// asChild 슬롯 밖의 손수 만든 버튼을 막음
if (!allowed.has('raw-element') && /<button[\s>]/.test(text)) {
  const hasSlot = /asChild/.test(text) || /asChild/.test(existing);
  if (!hasSlot) {
    findings.push(
      '[raw-element] 버튼을 직접 만들었습니다\n  Chakra Button 이나 IconButton 을 쓰고 다른 태그가 필요하면 asChild 로 감싸십시오',
    );
  }
}

if (findings.length) {
  deny([`디자인 시스템 밖의 값을 썼습니다: ${rel}`, '', ...findings, GUIDE].join('\n'));
}

process.exit(0);
