import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const POST_DIR = "content/post";
const README_PATH = "README.md";
const BLOG_URL = "https://gjsk132.github.io";
const CATEGORY_MARKER_NAMES = { 기타: "ETC" };
const USE_STAGED_POSTS = process.argv.includes("--staged");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") return [fullPath];
    return [];
  });
}

function gitPath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function listStagedPostFiles() {
  const output = execFileSync("git", ["ls-files", "-z", "--cached", "--", `${POST_DIR}/`], {
    encoding: "utf-8",
  });

  return output
    .split("\0")
    .filter((filePath) => filePath.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function readPostFile(filePath) {
  if (!USE_STAGED_POSTS) return fs.readFileSync(filePath, "utf-8");

  return execFileSync("git", ["show", `:${gitPath(filePath)}`], {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 20,
  });
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};

  const data = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const listMatch = line.match(/^\s*-\s+(.*)$/);

    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }

      data[currentKey].push(listMatch[1].trim());
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, value] = keyMatch;
    currentKey = key;

    if (value === "true") {
      data[key] = true;
    } else if (value === "false") {
      data[key] = false;
    } else {
      data[key] = value.trim();
    }
  }

  return data;
}

function normalizePost(filePath) {
  const raw = readPostFile(filePath);
  const frontmatter = parseFrontmatter(raw);
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((tag) => String(tag).replace(/_+/g, " ").trim()).filter(Boolean)
    : [];

  return {
    title: path.basename(filePath, path.extname(filePath)),
    path: gitPath(filePath),
    date: frontmatter.date || frontmatter.pubDate || "",
    category: frontmatter.category || frontmatter.categories?.[0] || "기타",
    tags,
    summary: frontmatter.summary || frontmatter.description || "",
    draft: frontmatter.draft === true,
  };
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;

    if (timeA !== timeB) return timeB - timeA;
    return a.title.localeCompare(b.title, "ko");
  });
}

function countBy(items, keyFn) {
  const counts = new Map();

  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function escapeTable(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function markerName(category) {
  if (CATEGORY_MARKER_NAMES[category]) return CATEGORY_MARKER_NAMES[category];

  return (
    category
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase() || "UNCATEGORIZED"
  );
}

function postLink(post) {
  return `[${escapeTable(post.title)}](${encodeURI(post.path)})`;
}

function compareCategories(a, b) {
  if (a === "TIL") return -1;
  if (b === "TIL") return 1;
  if (a === "기타") return 1;
  if (b === "기타") return -1;
  return a.localeCompare(b, "ko");
}

function renderStats(posts) {
  const categoryCounts = countBy(posts, (post) => post.category);
  const tagCounts = countBy(posts.flatMap((post) => post.tags), (tag) => tag);
  const categoryRows = [
    `| 전체 | ${posts.length} |`,
    ...[...categoryCounts.entries()]
      .sort(([a], [b]) => compareCategories(a, b))
      .map(([category, count]) => `| ${escapeTable(category)} | ${count} |`),
  ];
  const tagRows = [...tagCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([tag, count]) => `| ${escapeTable(tag)} | ${count} |`);

  return [
    "<!-- BLOG_STATS_START -->",
    "",
    "| 카테고리 | 게시글 수 |",
    "| --- | ---: |",
    ...categoryRows,
    "",
    "### 태그별 게시글 수",
    "",
    "| 태그 | 게시글 수 |",
    "| --- | ---: |",
    ...(tagRows.length > 0 ? tagRows : ["| - | 0 |"]),
    "",
    "<!-- BLOG_STATS_END -->",
  ].join("\n");
}

function renderPostTable(posts, columns = ["date", "title", "summary", "tags"]) {
  const headers = { date: "날짜", title: "제목", summary: "요약", tags: "태그" };

  return [
    `| ${columns.map((column) => headers[column]).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...sortPosts(posts).map((post) => {
      const values = {
        date: post.date || "날짜 없음",
        title: postLink(post),
        summary: escapeTable(post.summary),
        tags: post.tags.length > 0 ? escapeTable(post.tags.join(", ")) : "-",
      };

      return `| ${columns.map((column) => values[column]).join(" | ")} |`;
    }),
  ].join("\n");
}

function renderTilSection(posts) {
  const tilPosts = posts.filter((post) => post.category === "TIL");
  if (tilPosts.length === 0) return "";

  return [
    "## TIL",
    "",
    "<!-- TIL_STATS_START -->",
    "",
    renderPostTable(tilPosts, ["date", "title", "tags"]),
    "",
    "<!-- TIL_STATS_END -->",
  ].join("\n");
}

function renderCategorySection(category, posts) {
  const marker = markerName(category);

  return [
    `## ${category}`,
    "",
    `<!-- CATEGORY_${marker}_START -->`,
    "",
    renderPostTable(posts),
    "",
    `<!-- CATEGORY_${marker}_END -->`,
  ].join("\n");
}

function renderReadme(posts) {
  const categories = [...new Set(posts.map((post) => post.category))].sort(compareCategories);
  const sections = [];
  const tilSection = renderTilSection(posts);

  if (tilSection) sections.push(tilSection);

  for (const category of categories) {
    if (category === "TIL") continue;
    sections.push(renderCategorySection(category, posts.filter((post) => post.category === category)));
  }

  return [
    "# gjsk132.github.io",
    "",
    `[블로그 보러가기](${BLOG_URL})`,
    "",
    "## 나의 게시글 현황",
    "",
    renderStats(posts),
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}

const postFiles = USE_STAGED_POSTS ? listStagedPostFiles() : walk(POST_DIR);
const posts = sortPosts(postFiles.map(normalizePost).filter((post) => !post.draft));

fs.writeFileSync(README_PATH, renderReadme(posts), "utf-8");
console.log(
  `README updated with ${posts.length} ${USE_STAGED_POSTS ? "staged " : ""}post(s).`,
);
