import path from 'node:path';

const imagePattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const urlPattern = /^[a-z][a-z\d+.-]*:|^\/|^#|^\.\.\/asset\//i;

function assetUrlFor(filePath, imageName) {
	const parsed = path.parse(filePath);
	const postName = parsed.name;

	return `../asset/${postName}/${imageName.trim()}`;
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
		const alt = (match[2] ?? path.parse(imageName).name).trim();

		parts.push({
			type: 'image',
			url: assetUrlFor(filePath, imageName),
			alt,
		});

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
