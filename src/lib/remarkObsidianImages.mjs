import path from 'node:path';

const imagePattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const urlPattern = /^[a-z][a-z\d+.-]*:|^\/|^#|^\.\.\/asset\//i;
const sizePattern = /^(\d+)(?:x(\d+))?$/;

// Obsidian 'Custom Attachment Location' 플러그인은 첨부 폴더명을 만들 때
// 아래 특수문자(플러그인 설정 specialCharacters: "#^[]|*\<>:?/")를 '-'로 치환한다.
// 노트 파일명에 이 문자가 있으면 실제 생성된 폴더명과 어긋나므로, 경로를 만들 때
// 동일한 규칙으로 치환해 맞춰준다. (플러그인 설정이 바뀌면 여기도 함께 맞춰야 함)
const OBSIDIAN_SPECIAL_CHARS = /[#^[\]|*\\<>:?\/]/g;

function sanitizeForAttachmentFolder(name) {
	return name.replace(OBSIDIAN_SPECIAL_CHARS, '-');
}

// 지정한 표시 크기의 몇 배 해상도로 실제 이미지를 생성할지.
// 화면에는 작게 보여주되, 클릭해 확대할 때 화질이 깨지지 않도록 여유 해상도를 확보한다.
// (Astro는 원본보다 크게 업스케일하지 않으므로 원본 해상도가 상한이 된다.)
const ZOOM_SCALE = 3;

// Obsidian의 `![[파일|300]]`, `![[파일|300x200]]`, `![[파일|설명|300]]` 문법을 해석한다.
// 파이프 뒤 값 중 숫자(또는 숫자x숫자)는 크기로, 나머지는 alt 텍스트로 사용한다.
function parseMeta(rawMeta, imageName) {
	const fallbackAlt = path.parse(imageName).name;

	if (rawMeta == null) return { alt: fallbackAlt };

	let alt;
	let width;
	let height;

	for (const segment of rawMeta.split('|')) {
		const value = segment.trim();
		if (!value) continue;

		const size = sizePattern.exec(value);
		if (size) {
			width = Number(size[1]);
			if (size[2] != null) height = Number(size[2]);
			continue;
		}

		if (alt == null) alt = value;
	}

	return { alt: alt ?? fallbackAlt, width, height };
}

function assetUrlFor(filePath, imageName) {
	const parsed = path.parse(filePath);
	const noteName = sanitizeForAttachmentFolder(parsed.name);
	const folderName = sanitizeForAttachmentFolder(path.basename(parsed.dir));
	const prefix = folderName ? `${folderName}/` : '';

	return `../asset/${prefix}${noteName}/${imageName.trim()}`;
}

function convertTextNode(node, filePath) {
	const value = node.value;
	const parts = [];
	let lastIndex = 0;
	let match;

	imagePattern.lastIndex = 0;

	while ((match = imagePattern.exec(value)) !== null) {
		if (match.index > lastIndex) {
			parts.push({
				type: 'text',
				value: value.slice(lastIndex, match.index),
			});
		}

		const imageName = match[1].trim();
		const { alt, width, height } = parseMeta(match[2], imageName);

		const image = {
			type: 'image',
			url: assetUrlFor(filePath, imageName),
			alt,
		};

		if (width != null) {
			// width: 실제 생성 해상도(표시 크기의 ZOOM_SCALE배), style: 화면 표시 크기
			const hProperties = {
				width: width * ZOOM_SCALE,
				style: `width: ${width}px;`,
			};
			if (height != null) {
				hProperties.height = height * ZOOM_SCALE;
				hProperties.style += ` height: ${height}px;`;
			}
			image.data = { hProperties };
		}

		parts.push(image);

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex === 0) return null;

	if (lastIndex < value.length) {
		parts.push({
			type: 'text',
			value: value.slice(lastIndex),
		});
	}

	return parts;
}

function transformNode(node, filePath) {
	if (!node || !Array.isArray(node.children)) return;

	const nextChildren = [];

	for (const child of node.children) {
		if (child.type === 'text') {
			const converted = convertTextNode(child, filePath);
			nextChildren.push(...(converted ?? [child]));
			continue;
		}

		if (child.type === 'image' && child.url && !urlPattern.test(child.url)) {
			child.url = assetUrlFor(filePath, child.url);
		}

		transformNode(child, filePath);
		nextChildren.push(child);
	}

	node.children = nextChildren;
}

export function remarkObsidianImages() {
	return function transform(tree, file) {
		const filePath = file?.history?.[0] ?? '';
		transformNode(tree, filePath);
	};
}
