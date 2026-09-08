#!/usr/bin/env node
// 기획·기록 문서는 노션 단일 원천, 레포 .md 는 하네스 문서만 허용

import { readFileSync } from 'node:fs';
import path from 'node:path';

// 하네스가 직접 읽는 설정성 문서만 예외
const ALLOWED = [
  /(^|\/)CLAUDE(\.local)?\.md$/,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)HANDOFF\.md$/,
  /(^|\/)\.claude\//,
  /(^|\/)\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE|pull_request_template)/i,
  /(^|\/)\.cursor\//,
  /(^|\/)\.codex\//,
];

const MD = '\\.mdx?';
const PATHCHAR = '[^\\s|;&<>()"\'`]';
const TAIL = '(?=$|[\\s|;&)])';

const RE_MD = new RegExp(MD + '$', 'i');
const RE_QUOTED = new RegExp('(?:^|[^>=])>>?\\s*(?:"([^"]+' + MD + ')"|\'([^\']+' + MD + ')\')', 'g');
const RE_WRITERS = [
  new RegExp('(?:^|[^>=])>>?\\s*(' + PATHCHAR + '+' + MD + ')' + TAIL, 'g'),
  new RegExp('\\btee\\s+(?:-a\\s+)?["\']?(' + PATHCHAR + '+' + MD + ')["\']?' + TAIL, 'g'),
  new RegExp('\\btouch\\s+(?:-\\S+\\s+)*["\']?(' + PATHCHAR + '+' + MD + ')["\']?' + TAIL, 'g'),
  new RegExp('\\bsed\\s+(?:-\\S+\\s+|\'[^\']*\'\\s+|"[^"]*"\\s+)*-i\\S*\\s+(?:\\S+\\s+)*?["\']?(' + PATHCHAR + '+' + MD + ')["\']?' + TAIL, 'g'),
];

function isAllowed(p) {
  return ALLOWED.some((re) => re.test(p));
}

function isMarkdown(p) {
  return RE_MD.test(p);
}

function deny(target, tool) {
  const reason = [
    '문서를 .md 파일로 만들 수 없습니다: ' + target,
    '이 저장소의 문서 단일 원천은 노션입니다. PRD, ADR, 결정 기록, 작업 로그, 일정, 아키텍처, 회의록, 리서치, 제출 자료를 포함한 모든 문서는 노션 페이지로 작성하십시오.',
    '레포에 허용되는 .md 는 하네스 문서뿐입니다: CLAUDE.md, AGENTS.md, .claude/**, .github 템플릿.',
    '차단된 도구: ' + tool,
  ].join('\n');
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

// 커밋 메시지·PR 본문의 언급이 리다이렉션으로 오인되지 않도록 본문 제거
function stripLiterals(cmd) {
  let s = cmd.replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*?\n\2\b/g, ' HEREDOC ');
  s = s.replace(/`[^`]*`/g, ' ');
  return s;
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const tool = input.tool_name ?? '';
const params = input.tool_input ?? {};
const cwd = input.cwd ?? process.cwd();

if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
  const raw = params.file_path ?? params.notebook_path ?? '';
  if (!raw) process.exit(0);
  const rel = path.relative(cwd, path.resolve(cwd, raw)) || raw;
  if (isMarkdown(rel) && !isAllowed(rel) && !isAllowed(raw)) deny(rel, tool);
  process.exit(0);
}

if (tool === 'Bash') {
  const cmd = params.command ?? '';
  // 따옴표 리다이렉션 타깃은 리터럴 제거 전에 검사
  for (const m of cmd.matchAll(RE_QUOTED)) {
    const target = m[1] ?? m[2];
    if (target && !isAllowed(target)) deny(target, 'Bash');
  }
  const scanned = stripLiterals(cmd);
  for (const re of RE_WRITERS) {
    for (const m of scanned.matchAll(re)) {
      const target = m[1];
      if (target && !isAllowed(target)) deny(target, 'Bash');
    }
  }
}

process.exit(0);
