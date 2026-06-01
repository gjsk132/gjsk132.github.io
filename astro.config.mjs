// @ts-check
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import { remarkObsidianImages } from './src/lib/remarkObsidianImages.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://gjsk132.github.io',
	markdown: {
		processor: unified({
			remarkPlugins: [remarkObsidianImages],
		}),
	},
});
