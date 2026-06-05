// @ts-check
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import { remarkObsidianImages } from './src/lib/remarkObsidianImages.mjs';

function remarkSingleLineBreaks() {
	return (tree) => {
		replaceSoftBreaks(tree);
	};
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
			remarkPlugins: [remarkObsidianImages, remarkSingleLineBreaks],
		}),
	},
});
