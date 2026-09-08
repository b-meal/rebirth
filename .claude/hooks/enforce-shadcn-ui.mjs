#!/usr/bin/env node
// UI 프리미티브는 shadcn 레지스트리 산출물만 사용, 직접 마크업 금지

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// 레지스트리를 붙인 앱만 대상, 늘어나면 여기에 추가
const APPS = ['apps/admin'];

// 레지스트리 산출물 자체와 설정 파일은 규칙 대상 아님
const EXEMPT = [/\/components\/ui\//, /\/hooks\/use-mobile\.ts$/, /\/lib\/utils\.ts$/];

// 여는 태그만 검사, 종료 태그와 자기 종료 태그 모두 포함
const PRIMITIVES = {
  button: 'Button',
  input: 'Input',
  textarea: 'Textarea',
  select: 'Select 또는 NativeSelect',
  label: 'Label 또는 FieldLabel',
  table: 'Table',
  thead: 'TableHeader',
  tbody: 'TableBody',
  tfoot: 'TableFooter',
  tr: 'TableRow',
  th: 'TableHead',
  td: 'TableCell',
  caption: 'TableCaption',
  dialog: 'Dialog',
  progress: 'Progress',
  fieldset: 'FieldSet',
  legend: 'FieldLegend',
  hr: 'Separator',
  details: 'Collapsible',
  summary: 'CollapsibleTrigger',
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

const abs = path.resolve(cwd, raw);
const rel = path.relative(cwd, abs);

const app = APPS.find((a) => rel === a || rel.startsWith(a + path.sep));
if (!app) process.exit(0);
if (!/\.(tsx|jsx)$/.test(rel)) process.exit(0);
if (EXEMPT.some((re) => re.test('/' + rel))) process.exit(0);

// Write 는 전문, Edit 는 새로 들어가는 조각만 검사
const text = tool === 'Write' ? (params.new_string ?? params.content ?? '') : (params.new_string ?? '');
if (!text) process.exit(0);

const uiDir = path.join(cwd, app, 'components', 'ui');

// 없는 컴포넌트를 import 하면 CLI 로 먼저 추가하도록 유도
const missing = [];
for (const m of text.matchAll(/from\s+["']@\/components\/ui\/([a-z0-9-]+)["']/g)) {
  const name = m[1];
  if (!existsSync(path.join(uiDir, name + '.tsx'))) missing.push(name);
}
if (missing.length) {
  const names = [...new Set(missing)];
  deny(
    [
      'components/ui 에 없는 컴포넌트를 import 했습니다: ' + names.join(', '),
      '직접 파일을 만들지 말고 레지스트리에서 받으십시오.',
      '  pnpm dlx shadcn@latest add ' + names.join(' ') + ' -c ' + app,
      '그다음 다시 편집하십시오.',
    ].join('\n'),
  );
}

// 프리미티브 직접 사용 차단
const hits = new Set();
for (const [tag, replacement] of Object.entries(PRIMITIVES)) {
  const re = new RegExp('<' + tag + '(?=[\\s/>])', 'g');
  if (re.test(text)) hits.add(tag + ' → ' + replacement);
}
if (hits.size) {
  deny(
    [
      'UI 프리미티브를 직접 썼습니다. shadcn 컴포넌트로 바꾸십시오.',
      ...[...hits].map((h) => '  ' + h),
      'components/ui 에 없으면 먼저 받으십시오: pnpm dlx shadcn@latest add <name> -c ' + app,
      '구조용 태그(div, span, main, header, section, p, h1~h6, ul, li, form, a, img)는 허용합니다.',
    ].join('\n'),
  );
}

process.exit(0);
