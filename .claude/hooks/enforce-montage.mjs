#!/usr/bin/env node
// admin 의 UI 단일 원천 유지, web 은 enforce-design-system 이 SEED 로 검사

import { readFileSync } from 'node:fs';
import path from 'node:path';

const APPS = ['apps/admin'];

// 제거된 shadcn 계열. 되살아나면 차단
const BANNED_IMPORTS = [
  'class-variance-authority',
  'tailwind-merge',
  'tw-animate-css',
  '@base-ui/react',
  '@hugeicons/react',
  '@hugeicons/core-free-icons',
  'cmdk',
  'from "cn"',
  "from 'cn'",
];

// admin 은 Montage 를 그대로 쓰므로 shadcn 경로가 되살아나면 안 됨
const BANNED_BY_APP = {
  'apps/admin': ['@/components/ui/'],
};

const UI_SOURCE = {
  'apps/admin': '@wanteddev/wds 와 @wanteddev/wds-icon',
};

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

const rel = path.relative(cwd, path.resolve(cwd, raw));
const app = APPS.find((a) => rel === a || rel.startsWith(a + path.sep));
if (!app) process.exit(0);
if (!/\.(tsx|jsx)$/.test(rel)) process.exit(0);

const text = tool === 'Write' ? (params.content ?? '') : (params.new_string ?? '');
if (!text) process.exit(0);

const banned = [...BANNED_IMPORTS, ...(BANNED_BY_APP[app] ?? [])];
const hits = banned.filter((b) => text.includes(b));
if (hits.length) {
  deny(
    [
      'shadcn 계열 import 가 남아 있습니다: ' + hits.join(', '),
      `${app} 의 UI 는 ${UI_SOURCE[app]} 를 씁니다.`,
      '필요한 컴포넌트가 없으면 테마 토큰 위에 직접 만들고 components/ 아래에 둡니다.',
    ].join('\n'),
  );
}

// Tailwind 유틸리티 클래스 유입 차단
if (/className=["'][^"']*\b(flex|grid|gap-\d|p-\d|px-\d|py-\d|m-\d|mt-\d|text-(xs|sm|base|lg|xl)|font-(medium|semibold|bold)|rounded|border|bg-|w-full|min-h-)/.test(text)) {
  deny(
    [
      'Tailwind 유틸리티 클래스를 썼습니다. admin 에서 Tailwind 를 제거했습니다.',
      '레이아웃 컴포넌트의 props 나 sx prop 으로 대체하십시오.',
    ].join('\n'),
  );
}

process.exit(0);
