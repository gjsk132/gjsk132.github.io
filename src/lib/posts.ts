export interface BlogPostFrontmatter {
	title?: string;
	description?: string;
	summary?: string;
	pubDate?: string | Date;
	date?: string | Date;
	updatedDate?: string | Date;
	category?: string;
	categories?: string[];
	tags?: string[];
	draft?: boolean;
}

export interface BlogPost {
	slug: string;
	frontmatter: BlogPostFrontmatter;
	excerpt: string;
	body: string;
	Content: unknown;
}

interface BlogPostModule {
	frontmatter: BlogPostFrontmatter;
	Content: unknown;
}

const postModules = import.meta.glob<BlogPostModule>('../../content/post/**/*.md');
const rawPostModules = import.meta.glob<string>('../../content/post/**/*.md', {
	query: '?raw',
	import: 'default',
});

function slugFromPath(path: string) {
	return path
		.replace('../../content/post/', '')
		.replace(/\.md$/, '')
		.replace(/\\/g, '/');
}

function postDate(post: BlogPost) {
	const value = getPostDate(post);
	return value ? new Date(value).getTime() : 0;
}

function stripFrontmatter(rawPost: string) {
	return rawPost.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function firstBodyLine(rawPost: string) {
	return stripFrontmatter(rawPost)
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => line && !line.startsWith('![') && !line.startsWith('```')) ?? '';
}

function postExcerpt(frontmatter: BlogPostFrontmatter, rawPost: string) {
	return frontmatter.description ?? frontmatter.summary ?? firstBodyLine(rawPost);
}

export async function getAllPosts() {
	const posts = await Promise.all(
		Object.entries(postModules).map(async ([path, loadPost]) => {
			const mod = await loadPost();
			const rawPost = rawPostModules[path] ? await rawPostModules[path]() : '';

			return {
				slug: slugFromPath(path),
				frontmatter: mod.frontmatter ?? {},
				excerpt: postExcerpt(mod.frontmatter ?? {}, rawPost),
				body: stripFrontmatter(rawPost),
				Content: mod.Content,
			};
		}),
	);

	return posts
		.filter((post) => !post.frontmatter.draft)
		.sort((a, b) => postDate(b) - postDate(a));
}

export async function getPostBySlug(slug: string) {
	const posts = await getAllPosts();
	return posts.find((post) => post.slug === slug);
}

export function getPostCategories(posts: BlogPost[]) {
	const categories = posts.map(
		(post) => post.frontmatter.category ?? post.frontmatter.categories?.[0] ?? 'none',
	);

	return [...new Set(categories)];
}

export function getPostCategoryCounts(posts: BlogPost[]) {
	return posts.reduce<Record<string, number>>((counts, post) => {
		const category = post.frontmatter.category ?? post.frontmatter.categories?.[0] ?? 'none';
		counts[category] = (counts[category] ?? 0) + 1;
		return counts;
	}, {});
}

export function getPostTags(posts: BlogPost[]) {
	const tags = posts.flatMap((post) => post.frontmatter.tags ?? []);
	return [...new Set(tags.filter(Boolean))];
}

export function getPostDate(post: BlogPost) {
	return post.frontmatter.pubDate ?? post.frontmatter.date;
}

export function formatPostDate(value: string | Date | undefined) {
	if (!value) return '';

	return new Intl.DateTimeFormat('ko-KR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(new Date(value));
}
