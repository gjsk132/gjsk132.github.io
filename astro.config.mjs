// @ts-check
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import { remarkObsidianImages } from './src/lib/remarkObsidianImages.mjs';

// 연속된 공백 중 첫 칸만 일반 공백으로 두고 나머지는 non-breaking space로 바꿔
// Obsidian에서 여러 칸 띄운 간격을 웹에서도 그대로 보이게 한다.
const NBSP = String.fromCharCode(0x00a0);

function remarkSingleLineBreaks() {
	return (tree) => {
		replaceSoftBreaks(tree);
	};
}

function remarkPreserveSpaces() {
	return (tree) => {
		preserveSpaces(tree);
	};
}

// Obsidian에서 빈 줄을 여러 개 넣으면 마크다운이 문단 구분 하나로 합쳐버린다.
// 각 블록 노드의 소스 줄 번호(position)로 사이의 빈 줄 수를 역산해, 기본 한 줄을
// 초과하는 만큼 <br>를 넣어 웹에서도 연속 줄바꿈이 그대로 보이게 한다.
function remarkPreserveBlankLines() {
	return (tree) => {
		preserveBlankLines(tree);
	};
}

function preserveBlankLines(node) {
	if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;

	for (const child of node.children) {
		preserveBlankLines(child);
	}

	const isBlockContainer = node.type === 'root' || node.type === 'blockquote' || node.type === 'listItem';
	if (!isBlockContainer) return;

	const nextChildren = [];

	for (let index = 0; index < node.children.length; index += 1) {
		const child = node.children[index];
		nextChildren.push(child);

		const next = node.children[index + 1];
		const endLine = child.position?.end?.line;
		const startLine = next?.position?.start?.line;

		if (typeof endLine !== 'number' || typeof startLine !== 'number') continue;

		const extraBlankLines = startLine - endLine - 2;

		for (let count = 0; count < extraBlankLines; count += 1) {
			nextChildren.push({ type: 'html', value: '<br>' });
		}
	}

	node.children = nextChildren;
}

function preserveSpaces(node) {
	if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;

	for (const child of node.children) {
		if (child?.type === 'text' && typeof child.value === 'string') {
			child.value = child.value.replace(/ {2,}/g, (spaces) => ' ' + NBSP.repeat(spaces.length - 1));
			continue;
		}

		preserveSpaces(child);
	}
}

function replaceSoftBreaks(node) {
	if (!node || typeof node !== 'object') return;

	if (Array.isArray(node.children)) {
		node.children = node.children.flatMap((child) => {
			if (child?.type !== 'text' || typeof child.value !== 'string' || !child.value.includes('\n')) {
				replaceSoftBreaks(child);
				return [child];
			}

			return child.value.split('\n').flatMap((value, index, values) => {
				const nodes = value ? [{ ...child, value }] : [];
				if (index < values.length - 1) nodes.push({ type: 'break' });
				return nodes;
			});
		});
		return;
	}

	replaceSoftBreaks(node.children);
}

// https://astro.build/config
export default defineConfig({
	site: 'https://gjsk132.github.io',
	markdown: {
		shikiConfig: {
			theme: 'github-dark',
		},
		processor: unified({
			remarkPlugins: [remarkObsidianImages, remarkPreserveBlankLines, remarkPreserveSpaces, remarkSingleLineBreaks],
		}),
	},
});
