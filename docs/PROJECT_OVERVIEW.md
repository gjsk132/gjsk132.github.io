# Project Overview

이 문서는 프로젝트 전체를 다시 읽지 않아도 구조와 수정 지점을 빠르게 파악하기 위한 요약입니다.

## 한 줄 요약

Astro 6 기반의 정적 개인 블로그입니다. Obsidian에서 작성한 Markdown을 `content/post`와 `content/index`에 저장하고, Astro 페이지에서 읽어 블로그 글과 개념 사전으로 보여줍니다.

## 실행과 빌드

- 패키지 매니저: npm
- 개발 서버: `npm run dev`
- 정적 빌드: `npm run build`
- 미리보기: `npm run preview`
- 이미지 최적화: `npm run optimize:images`
- README 통계 갱신: `npm run update:readme`

작업 규칙상 `npm run dev`, `git status`, `git commit`, `git push`는 사용자가 요청할 때만 실행합니다.
사용자는 기본적으로 Git Bash를 사용하므로 문서와 안내 명령은 Git Bash 기준으로 작성합니다.

## 주요 디렉터리

- `AGENTS.md`: Codex와 AI 코딩 도구가 따라야 하는 프로젝트 작업 규칙입니다.
- `SKILLS.md`: 기존 Codex 작업 규칙 기록입니다. `AGENTS.md`와 같은 방향의 규칙을 보관합니다.
- `src/pages/index.astro`: 홈 화면. 게시글 목록, 필터, 검색, 페이지네이션, 보기 형태 전환을 담당합니다.
- `src/pages/blog/index.astro`: 카테고리별 게시글 목록 페이지입니다.
- `src/pages/blog/[slug].astro`: 개별 게시글 페이지입니다. Markdown 렌더링, 코드 복사 버튼, Mermaid 렌더링, 이전/다음 글 이동을 담당합니다.
- `src/pages/index/index.astro`: 개념 사전 페이지입니다. `content/index`의 Markdown을 카드형 사전으로 보여주고 hover/focus 설명을 띄웁니다.
- `src/components/BlogLayout.astro`: 공통 블로그 레이아웃입니다. 사이드바, 모바일 상단바, 검색 버튼, 보기 전환 버튼, 링크 prefetch가 여기에 있습니다.
- `src/layouts/Layout.astro`: HTML shell과 전역 CSS 변수, 기본 스타일을 정의합니다.
- `src/lib/posts.ts`: `content/post/**/*.md`를 읽어 게시글 목록으로 변환합니다.
- `src/lib/indexEntries.ts`: `content/index/**/*.md`를 읽어 개념 사전 항목으로 변환합니다.
- `src/lib/remarkObsidianImages.mjs`: Obsidian 이미지 문법을 Astro에서 사용할 수 있게 변환합니다.
- `content/post`: 블로그 게시글 Markdown 위치입니다.
- `content/index`: 개념 사전 Markdown 위치입니다.
- `content/asset`: 게시글 이미지 asset 위치입니다.
- `content/templates`: Obsidian용 글/개념 템플릿입니다.
- `public`: favicon, 프로필 이미지 등 정적 public asset 위치입니다.
- `scripts`: 이미지 변환과 README 자동 갱신 스크립트가 있습니다.

## 콘텐츠 규칙

### 게시글

게시글은 `content/post/**/*.md`에 둡니다. `src/lib/posts.ts`가 frontmatter와 본문을 읽습니다.

자주 쓰는 frontmatter:

```yaml
---
title:
description:
summary:
pubDate:
category:
tags:
draft:
---
```

- `title`이 없으면 파일 경로 기반 slug가 제목처럼 사용됩니다.
- `description` 또는 `summary`가 목록 설명으로 사용됩니다.
- `draft: true`인 글은 목록에서 제외됩니다.
- `category`가 없으면 `none`으로 분류됩니다.

### 개념 사전

개념은 `content/index/**/*.md`에 둡니다. 현재 권장 frontmatter:

```yaml
---
define: 짧은 정의
summary: 조금 더 긴 설명
tags:
  - example
---
```

- `define`이 hover/focus tooltip의 핵심 설명으로 사용됩니다.
- `summary`가 있으면 카드 본문 설명으로 우선 사용됩니다.
- 둘 다 없으면 본문 첫 줄을 설명으로 사용합니다.
- 파일명에서 확장자를 제거한 값이 기본 항목명입니다.

## UI 흐름

- 공통 레이아웃은 데스크톱에서 왼쪽 사이드바와 오른쪽 콘텐츠 그리드로 구성됩니다.
- 모바일에서는 사이드바 대신 고정 상단바를 사용합니다.
- 홈의 보기 전환 버튼은 `postViewMode`를 `localStorage`에 저장합니다.
- 홈에서 필터나 보기 형태가 바뀔 때 화면이 순간적으로 흔들릴 수 있으므로, 관련 변경 후에는 카드형/타임라인형 전환을 한 번 확인합니다.
- `/index/` 개념 사전 페이지는 홈 보기 전환 버튼의 영향을 받지 않습니다.

## 수정 시 주의점

- 기존 디자인은 밝은 회색 배경, 흰색 패널, 파란 accent를 기본으로 합니다.
- 카드 반경은 기존 파일에 18-24px가 많지만, 새 UI는 불필요하게 더 둥글게 만들지 않습니다.
- 마크다운 콘텐츠 경로를 추가할 때는 `import.meta.glob` 경로가 `src/lib` 기준 상대 경로인지 확인합니다.
- 문서와 Markdown은 UTF-8 기준으로 다룹니다.
- 한글이 깨져 보이면 파일 자체 문제인지 터미널 출력 문제인지 먼저 구분합니다. 안내 명령은 Git Bash 기준 `cat`, `sed`, `rg`를 우선 사용하고, PowerShell을 사용할 때만 `Get-Content -Encoding utf8`처럼 인코딩을 명시합니다.
- 설명이 필요한 정책/기획성 판단은 임의로 확정하지 말고 사용자에게 질문합니다.
