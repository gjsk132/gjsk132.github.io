# Project Overview

이 문서는 프로젝트 전체를 다시 읽지 않아도 구조와 수정 지점을 빠르게 파악하기 위한 요약입니다. 현재 폴더의 실제 파일 구성을 기준으로 작성합니다.

## 한 줄 요약

Astro 6 기반의 정적 개인 블로그입니다. Obsidian에서 작성한 Markdown을 `content/post`와 `content/wiki`에 저장하고, Astro가 이를 읽어 홈, 블로그 글, Wiki 페이지로 렌더링합니다.

## 기본 정보

- 패키지 매니저: npm
- Node 요구 버전: `>=22.12.0`
- 프레임워크: Astro
- Markdown 처리: `@astrojs/markdown-remark`의 `unified` processor
- 주요 런타임 의존성: `astro`, `mermaid`, `sharp`
- 배포 대상 URL: `https://gjsk132.github.io`

## 실행과 검증

`package.json` 기준 스크립트는 다음과 같습니다.

- 개발 서버: `npm run dev`
- 정적 빌드: `npm run build`
- 빌드 결과 미리보기: `npm run preview`
- Astro CLI: `npm run astro`
- 이미지 최적화: `npm run optimize:images`
- README 통계 갱신: `npm run update:readme`

작업 규칙상 사용자가 직접 요청하기 전에는 `npm run dev`, `git status`, `git commit`, `git push`를 실행하지 않습니다. 빌드, 린트, 테스트가 필요하면 어떤 검증이 필요한지 먼저 짧게 설명하고 사용자가 요청하거나 승인한 범위에서 실행합니다.

사용자는 기본적으로 Git Bash를 사용하므로 안내 명령과 문서 예시는 Git Bash 기준으로 작성합니다.

## 주요 디렉터리와 파일

- `AGENTS.md`: Codex와 AI 코딩 도구가 따라야 하는 프로젝트 작업 규칙입니다.
- `README.md`: 블로그 링크와 게시글 통계가 자동 갱신되는 문서입니다.
- `astro.config.mjs`: Astro 설정입니다. 사이트 URL, Shiki 테마, Obsidian 이미지 변환 remark 플러그인, 단일 줄바꿈 변환을 설정합니다.
- `src/layouts/Layout.astro`: HTML shell, meta 태그, GoatCounter 스크립트, 전역 CSS 변수와 기본 스타일을 정의합니다.
- `src/components/BlogLayout.astro`: 공통 블로그 레이아웃입니다. 데스크톱 사이드바, 모바일 상단바, 홈/Wiki 링크, 카테고리/태그 필터, 검색 버튼, 보기 전환 버튼을 담당합니다.
- `src/components/WikiTermHighlighter.astro`: 글 본문 안의 Wiki 용어를 찾아 처음 한 번만 하이라이트하고 툴팁을 붙입니다.
- `src/pages/index.astro`: 홈 화면입니다. 게시글 목록, 카테고리/태그 필터, 검색 패널, 페이지 크기, 페이지네이션, 게시글형/타임라인형 전환, 태그와 연결된 Wiki 요약을 담당합니다.
- `src/pages/blog/index.astro`: 카테고리별 게시글 목록 페이지입니다.
- `src/pages/blog/[slug].astro`: 개별 게시글 상세 페이지입니다. Markdown 렌더링, Wiki 용어 하이라이트, 코드 복사 버튼, Mermaid 렌더링, 이전/다음 글 이동을 담당합니다.
- `src/pages/wiki/index.astro`: Wiki 목록 페이지입니다. Wiki 검색과 카드형/타임라인형 보기 전환을 지원합니다.
- `src/pages/wiki/[slug].astro`: Wiki 상세 페이지입니다. 정의 목록, 별칭 태그, Markdown 본문, 코드 복사 버튼, Mermaid 렌더링, 다른 Wiki 용어 하이라이트를 담당합니다.
- `src/lib/posts.ts`: `content/post/**/*.md`를 읽어 게시글 목록으로 변환합니다.
- `src/lib/wikiEntries.ts`: `content/wiki/**/*.md`를 읽어 Wiki 항목으로 변환합니다.
- `src/lib/remarkObsidianImages.mjs`: Obsidian 이미지 문법과 상대 이미지 경로를 Astro에서 렌더링 가능한 asset 경로로 변환합니다.
- `content/post`: 블로그 게시글 Markdown 위치입니다.
- `content/wiki`: Wiki Markdown 위치입니다.
- `content/asset`: 게시글별 이미지 asset 위치입니다.
- `content/templates`: Obsidian용 게시글/Wiki 템플릿입니다.
- `content/wiki.base`: Obsidian Bases용 Wiki 테이블 설정입니다.
- `public`: favicon, 프로필 이미지 등 정적 public asset 위치입니다.
- `scripts`: 이미지 변환, README 갱신, Wiki 정의 동기화 스크립트가 있습니다.
- `.husky/pre-commit`: 커밋 전 이미지 변환, Wiki 정의 동기화, README 갱신을 실행합니다.
- `.github/workflows/deploy.yml`: GitHub Pages 배포 워크플로입니다.

## 콘텐츠 규칙

### 게시글

게시글은 `content/post/**/*.md`에 둡니다. `src/lib/posts.ts`는 Astro의 `import.meta.glob`로 Markdown 모듈과 raw 본문을 함께 읽습니다.

권장 frontmatter는 `content/templates/post_template.md` 기준입니다.

```yaml
---
summary:
date:
category:
tags:
---
```

코드에서 인식하는 필드는 다음과 같습니다.

```yaml
---
title:
description:
summary:
pubDate:
date:
updatedDate:
category:
categories:
tags:
draft:
---
```

- `title`이 없으면 slug가 제목처럼 사용됩니다.
- `description` 또는 `summary`가 목록 설명과 검색 미리보기의 우선값으로 사용됩니다.
- `pubDate` 또는 `date`가 정렬과 날짜 표시 기준입니다.
- `category`가 없으면 `categories[0]`, 둘 다 없으면 `none`으로 분류됩니다.
- `tags`는 홈/사이드바 필터와 검색 데이터로 사용됩니다.
- `draft: true`인 글은 목록과 상세 경로에서 제외됩니다.
- slug는 `content/post` 아래의 Markdown 경로에서 확장자를 제거한 값입니다.

### Wiki

Wiki 항목은 `content/wiki/**/*.md`에 둡니다. `src/lib/wikiEntries.ts`가 Astro frontmatter와 raw frontmatter를 함께 읽어 정의, 태그, 본문을 정리합니다.

권장 frontmatter는 `content/templates/wiki_template.md` 기준입니다.

```yaml
---
defines:
  - 제목: 정의
tags:
  - 같은 대상을 가리키는 다른 소문자 표기
---
```

- `defines`는 Wiki 카드, 상세 페이지, 홈의 태그 Wiki 요약, Wiki 용어 툴팁에 사용됩니다.
- `tags`는 같은 대상을 가리키는 별칭입니다. 하이라이팅과 참조 매칭은 대소문자를 구분하지 않으므로 영문 별칭은 소문자로 관리합니다.
- `defines`가 없으면 `define`, `description`, 본문을 plain text로 만든 값 순서로 대표 설명을 사용합니다.
- `title`이 없으면 파일명 기반 slug의 마지막 segment를 보기용 제목으로 사용합니다.
- `draft: true`인 Wiki는 목록과 상세 경로에서 제외됩니다.
- `/wiki/`의 카드는 `/wiki/[slug]/` 상세 페이지로 이동합니다.

## Markdown과 이미지 처리

`astro.config.mjs`는 두 가지 remark 처리를 추가합니다.

- `remarkObsidianImages`: `![[image.webp]]` 또는 `![[image.webp|alt]]` 형식을 Markdown image node로 바꿉니다. 게시글 파일명과 같은 이름의 asset 폴더를 기준으로 `../asset/{postName}/{imageName}` 경로를 만듭니다.
- `remarkSingleLineBreaks`: Markdown text node 안의 단일 줄바꿈을 hard break로 변환합니다.

일반 Markdown 이미지가 절대 URL, 루트 경로, anchor, `../asset/` 경로가 아니면 같은 방식으로 게시글별 asset 경로에 맞춥니다.

## 자동화 스크립트

### `scripts/convert-images.mjs`

pre-commit에서 스테이징된 `content/asset` 이미지 중 `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tif`, `.tiff`, `.gif`를 WebP로 변환합니다.

- `.webp`, `.avif`, `.svg`는 건너뜁니다.
- 변환 후 원본 파일을 제거합니다.
- Markdown/MDX 안의 파일명과 상대 경로를 새 `.webp` 경로로 갱신합니다.
- 변환된 이미지와 수정된 Markdown을 다시 stage합니다.

### `scripts/update-wiki-defines.mjs`

Wiki Markdown 본문에서 각 `##` 제목과 그 아래 첫 문장을 읽어 `defines` frontmatter로 동기화합니다.

- 일반 실행은 `content/wiki/**/*.md` 파일을 직접 읽고 씁니다.
- `--staged` 모드는 Git index에 스테이징된 Wiki 파일만 대상으로 합니다.
- `--staged` 실행 중 대상 파일에 unstaged 변경이 있으면 중단합니다.
- 기존 frontmatter 중 `define`, `defines` 외의 block은 보존합니다.

### `scripts/update-readme.mjs`

`content/post/**/*.md`를 읽어 `README.md`의 게시글 통계와 카테고리별 표를 다시 생성합니다.

- `--staged` 모드는 Git index에 스테이징된 게시글만 기준으로 README를 생성합니다.
- `draft: true`인 글은 제외합니다.
- 카테고리별 게시글 수, 태그별 게시글 수, TIL 섹션, 기타 카테고리 섹션을 출력합니다.
- 날짜 기준 내림차순, 날짜가 같으면 제목 기준으로 정렬합니다.

## pre-commit 흐름

`.husky/pre-commit`은 현재 다음 순서로 실행됩니다.

```sh
node scripts/convert-images.mjs
node scripts/update-wiki-defines.mjs --staged
git add content/wiki
node scripts/update-readme.mjs --staged
git add README.md
```

이 훅은 커밋 직전에 이미지, Wiki 정의, README 통계를 정리하기 위한 것입니다. Codex는 사용자 요청 없이 `git commit`을 실행하지 않습니다.

## UI 흐름

- 공통 레이아웃은 데스크톱에서 왼쪽 사이드바와 오른쪽 콘텐츠 영역으로 구성됩니다.
- 모바일에서는 사이드바 대신 고정 상단바를 사용합니다.
- 홈은 카테고리/태그 query string으로 초기 필터 상태를 정합니다.
- 홈 검색은 게시글 제목, 요약, 태그, 본문 plain text와 Wiki 제목, 정의, 본문 plain text를 함께 검색합니다.
- 홈 보기 전환 버튼은 `postViewMode`를 `localStorage`에 저장하고 `post-view-mode-change` 이벤트를 발생시킵니다.
- Wiki 목록은 검색어로 title/definition을 필터링하고, 홈과 같은 보기 전환 값을 반영합니다.
- 게시글 상세와 Wiki 상세는 코드 블럭에 복사 버튼을 붙이고, `mermaid` 코드 블럭은 클라이언트에서 Mermaid 다이어그램으로 렌더링합니다.
- Wiki 용어 하이라이트는 본문 내 첫 매칭만 툴팁으로 변환하며, 링크/코드/버튼/입력 요소 안은 건너뜁니다.
- 사이드바에서 태그 필터를 선택했을 때 같은 태그, title, slug를 가진 Wiki 항목이 있으면 홈에서 해당 Wiki 정의 요약과 상세 페이지 링크를 보여줍니다.

## 수정 시 주의점

- 기존 디자인은 밝은 회색 배경, 반투명 흰색 패널, 파란 accent를 기본으로 합니다.
- 전역 색상과 기본 폰트는 `src/layouts/Layout.astro`의 CSS 변수에서 관리합니다.
- 새 UI는 기존 레이아웃의 카드/패널 스타일과 간격을 먼저 따릅니다.
- Markdown 콘텐츠 경로를 추가하거나 옮길 때는 `import.meta.glob` 경로가 `src/lib` 기준 상대 경로인지 확인합니다.
- Obsidian 이미지 문법을 쓰는 경우 게시글 파일명과 같은 이름의 `content/asset/{postName}` 폴더에 이미지를 둡니다.
- 문서와 Markdown은 UTF-8 기준으로 다룹니다.
- 한글이 깨져 보이면 파일 자체 문제인지 터미널 출력 문제인지 먼저 구분합니다.
- 안내 명령은 Git Bash 기준 `cat`, `sed`, `rg`를 우선 사용하고, PowerShell을 사용할 때만 `Get-Content -Encoding utf8`처럼 인코딩을 명시합니다.
- 설명이 필요한 정책, 기획, 문구 방향, 정보 구조 판단은 임의로 확정하지 말고 사용자에게 질문합니다.
- UI 변경 후에는 홈의 게시글형/타임라인형 전환, 필터 적용, 검색 패널 표시, Wiki 목록 검색처럼 레이아웃이 바뀌는 상태를 확인할 수 있게 합니다.
