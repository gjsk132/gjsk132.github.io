import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const WIKI_DIR = "content/wiki";
const USE_STAGED = process.argv.includes("--staged");

function gitPath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function execGit(args) {
  return execFileSync("git", args, { encoding: "utf-8", maxBuffer: 1024 * 1024 * 20 });
}

function splitNull(output) {
  return output.split("\0").filter(Boolean);
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") return [gitPath(fullPath)];
    return [];
  });
}

function listStagedWikiFiles() {
  const output = execGit(["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR", "--", `${WIKI_DIR}/`]);

  return splitNull(output)
    .filter((filePath) => filePath.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function listUnstagedFiles(files) {
  return files.filter((filePath) => {
    const output = execGit(["diff", "--name-only", "-z", "--", filePath]);
    return splitNull(output).length > 0;
  });
}

function readWikiFile(filePath) {
  if (!USE_STAGED) return fs.readFileSync(filePath, "utf-8");

  return execGit(["show", `:${filePath}`]);
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: "", body: raw, hasFrontmatter: false };
  }

  return {
    frontmatter: match[1],
    body: raw.slice(match[0].length),
    hasFrontmatter: true,
  };
}

function firstSentence(paragraph) {
  const text = paragraph.replace(/\s+/g, " ").trim();
  const match = text.match(/^.+?[.!?。！？](?=\s|$)/);

  return (match?.[0] ?? text).trim();
}

function plainInlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

function collectFirstParagraph(lines, startIndex) {
  const paragraph = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      if (paragraph.length === 0) continue;
      break;
    }

    if (/^#{1,6}\s+/.test(trimmed)) break;
    if (/^[-*_]{3,}$/.test(trimmed)) continue;

    paragraph.push(trimmed);
  }

  return paragraph.join(" ");
}

function extractDefinitions(body) {
  const lines = body.split(/\r?\n/);
  const definitions = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^##\s+(.+?)\s*$/);
    if (!headingMatch) continue;

    const title = plainInlineMarkdown(headingMatch[1]);
    const paragraph = collectFirstParagraph(lines, index + 1);
    const define = firstSentence(plainInlineMarkdown(paragraph));

    if (title && define) {
      definitions.push({ title, define });
    }
  }

  return definitions;
}

function frontmatterBlocks(frontmatter) {
  const blocks = [];
  let current = [];

  for (const line of frontmatter.split(/\r?\n/)) {
    if (/^[A-Za-z0-9_-]+:\s*/.test(line) && current.length > 0) {
      blocks.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) blocks.push(current);

  return blocks.filter((block) => {
    const key = block[0]?.match(/^([A-Za-z0-9_-]+):/)?.[1];
    return key && key !== "define" && key !== "defines";
  });
}

function yamlScalar(value) {
  const text = String(value).trim();

  if (!text) return '""';
  if (/[:#[\]{}]|^\s|\s$|^-|^true$|^false$|^null$/i.test(text)) {
    return JSON.stringify(text);
  }

  return text;
}

function renderDefines(definitions) {
  return ["defines:", ...definitions.map((definition) => `  - ${yamlScalar(definition.title)}: ${yamlScalar(definition.define)}`)];
}

function renderFrontmatter(frontmatter, definitions) {
  const preservedBlocks = frontmatterBlocks(frontmatter);
  const lines = [renderDefines(definitions), ...preservedBlocks].flat();

  return `---\n${lines.join("\n")}\n---\n`;
}

function updateWikiFile(filePath) {
  const raw = readWikiFile(filePath);
  const { frontmatter, body } = splitFrontmatter(raw);
  const definitions = extractDefinitions(body);

  if (definitions.length === 0) return false;

  const nextRaw = `${renderFrontmatter(frontmatter, definitions)}${body}`;
  if (nextRaw === raw) return false;

  fs.writeFileSync(filePath, nextRaw, "utf-8");
  return true;
}

const wikiFiles = USE_STAGED ? listStagedWikiFiles() : listMarkdownFiles(WIKI_DIR);

if (USE_STAGED) {
  const unstagedFiles = listUnstagedFiles(wikiFiles);

  if (unstagedFiles.length > 0) {
    console.error("Cannot update wiki defines while these staged wiki files also have unstaged changes:");
    for (const filePath of unstagedFiles) console.error(`- ${filePath}`);
    console.error("Stage or stash those changes first, then commit again.");
    process.exit(1);
  }
}

let updatedCount = 0;

for (const filePath of wikiFiles) {
  if (updateWikiFile(filePath)) updatedCount += 1;
}

console.log(`Wiki defines updated in ${updatedCount} ${USE_STAGED ? "staged " : ""}file(s).`);
