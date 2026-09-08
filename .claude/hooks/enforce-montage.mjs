#!/usr/bin/env node
// UI 는 Montage(@wanteddev/wds) 단일 원천, shadcn 잔존물 유입 차단

import { readFileSync } from 'node:fs';
import path from 'node:path';

const APPS = ['apps/admin', 'apps/web'];

// 제거된 shadcn 계열. 되살아나면 차단
const BANNED_IMPORTS = [
  '@/components/ui/',
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

const hits = BANNED_IMPORTS.filter((b) => text.includes(b));
if (hits.length) {
  deny(
    [
      'shadcn 계열 import 가 남아 있습니다: ' + hits.join(', '),
      'UI 는 @wanteddev/wds 와 @wanteddev/wds-icon 만 씁니다.',
      '필요한 컴포넌트가 없으면 wds-theme 토큰 위에 직접 만들고 components/ 아래에 둡니다.',
    ].join('\n'),
  );
}

// Tailwind 유틸리티 클래스 유입 차단
if (/className=["'][^"']*\b(flex|grid|gap-\d|p-\d|px-\d|py-\d|m-\d|mt-\d|text-(xs|sm|base|lg|xl)|font-(medium|semibold|bold)|rounded|border|bg-|w-full|min-h-)/.test(text)) {
  deny(
    [
      'Tailwind 유틸리티 클래스를 썼습니다. admin 과 web 에서 Tailwind 를 제거했습니다.',
      'FlexBox 와 Box 의 props, 또는 sx prop 으로 대체하십시오.',
    ].join('\n'),
  );
}

process.exit(0);
