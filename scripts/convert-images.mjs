import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execSync } from "child_process";

const CONTENT_DIR = "content";
const ASSET_DIR = "content/asset";

const CONVERTIBLE_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tif",
    ".tiff",
    ".gif",
];

const SKIP_EXTENSIONS = [
    ".webp",
    ".avif",
    ".svg",
];

function run(command) {
    return execSync(command, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
    }).trim();
}

function quote(filePath) {
    return `"${filePath.replaceAll('"', '\\"')}"`;
}

function getStagedFiles() {
    const output = run("git diff --cached --name-only --diff-filter=ACM");

    if (!output) return [];

    return output
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean);
}

function walk(dir) {
    if (!fs.existsSync(dir)) return [];

    const result = [];

    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            result.push(...walk(fullPath));
        } else {
            result.push(fullPath);
        }
    }

    return result;
}

function isConvertibleImage(filePath) {
    const normalizedPath = filePath.replaceAll("\\", "/");
    const ext = path.extname(filePath).toLowerCase();

    if (!normalizedPath.startsWith(`${ASSET_DIR}/`)) return false;
    if (SKIP_EXTENSIONS.includes(ext)) return false;

    return CONVERTIBLE_EXTENSIONS.includes(ext);
}

async function convertImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const webpPath = filePath.slice(0, -ext.length) + ".webp";

    if (!fs.existsSync(filePath)) return null;

    if (fs.existsSync(webpPath)) {
        fs.unlinkSync(filePath);

        return {
            oldPath: filePath,
            newPath: webpPath,
        };
    }

    await sharp(filePath)
        .webp({ quality: 80 })
        .toFile(webpPath);

    fs.unlinkSync(filePath);

    console.log(`✅ ${filePath} -> ${webpPath}`);

    return {
        oldPath: filePath,
        newPath: webpPath,
    };
}

function updateMarkdownLinks(convertedImages) {
    const mdFiles = walk(CONTENT_DIR).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ext === ".md" || ext === ".mdx";
    });

    const updatedMdFiles = [];

    for (const mdFile of mdFiles) {
        let content = fs.readFileSync(mdFile, "utf-8");
        let updated = content;

        for (const { oldPath, newPath } of convertedImages) {
            const oldFileName = path.basename(oldPath);
            const newFileName = path.basename(newPath);

            const oldRelative = oldPath.replaceAll("\\", "/");
            const newRelative = newPath.replaceAll("\\", "/");

            updated = updated
                .replaceAll(oldFileName, newFileName)
                .replaceAll(oldRelative, newRelative);
        }

        if (updated !== content) {
            fs.writeFileSync(mdFile, updated);
            updatedMdFiles.push(mdFile);
            console.log(`📝 Updated links: ${mdFile}`);
        }
    }

    return updatedMdFiles;
}

function stageConvertedFiles(convertedImages, updatedMdFiles) {
    for (const { oldPath, newPath } of convertedImages) {
        run(`git add ${quote(newPath)}`);

        try {
            run(`git rm --cached ${quote(oldPath)}`);
        } catch {
            // 이미 staged 상태가 아니거나 삭제 처리된 경우 무시
        }
    }

    for (const mdFile of updatedMdFiles) {
        run(`git add ${quote(mdFile)}`);
    }
}

async function main() {
    const stagedFiles = getStagedFiles();

    const stagedImages = stagedFiles.filter(isConvertibleImage);

    if (stagedImages.length === 0) {
        console.log("No staged images to convert.");
        return;
    }

    const convertedImages = [];

    for (const image of stagedImages) {
        const result = await convertImage(image);

        if (result) {
            convertedImages.push(result);
        }
    }

    if (convertedImages.length === 0) {
        console.log("No images converted.");
        return;
    }

    const updatedMdFiles = updateMarkdownLinks(convertedImages);

    stageConvertedFiles(convertedImages, updatedMdFiles);

    console.log("✨ Image optimization complete.");
}

main().catch((error) => {
    console.error("❌ Image conversion failed.");
    console.error(error);
    process.exit(1);
});