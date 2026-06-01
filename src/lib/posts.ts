export interface BlogPostFrontmatter {
	title?: string;
	description?: string;
	pubDate?: string | Date;
	updatedDate?: string | Date;
	tags?: string[];
	draft?: boolean;
}

export interface BlogPost {
	slug: string;
	frontmatter: BlogPostFrontmatter;
	Content: unknown;
}

interface BlogPostModule {
	frontmatter: BlogPostFrontmatter;
	Content: unknown;
}

const postModules = import.meta.glob<BlogPostModule>('../../content/post/**/*.md');

function slugFromPath(path: string) {
	return path
		.replace('../../content/post/', '')
		.replace(/\.md$/, '')
		.replace(/\\/g, '/');
}

function postDate(post: BlogPost) {
	const value = post.frontmatter.pubDate;
	return value ? new Date(value).getTime() : 0;
}

export async function getAllPosts() {
	const posts = await Promise.all(
		Object.entries(postModules).map(async ([path, loadPost]) => {
			const mod = await loadPost();

			return {
				slug: slugFromPath(path),
				frontmatter: mod.frontmatter ?? {},
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

export function formatPostDate(value: string | Date | undefined) {
	if (!value) return '';

	return new Intl.DateTimeFormat('ko-KR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(new Date(value));
}
