export interface WikiEntryFrontmatter {
	title?: string;
	define?: string;
	description?: string;
	tags?: string[];
	property?: string;
	draft?: boolean;
}

export interface WikiEntry {
	slug: string;
	title: string;
	frontmatter: WikiEntryFrontmatter;
	definition: string;
	body: string;
	Content: unknown;
}

interface WikiEntryModule {
	frontmatter: WikiEntryFrontmatter;
	Content: unknown;
}

const wikiModules = import.meta.glob<WikiEntryModule>('../../content/wiki/**/*.md');
const rawWikiModules = import.meta.glob<string>('../../content/wiki/**/*.md', {
	query: '?raw',
	import: 'default',
});

function slugFromPath(path: string) {
	return path
		.replace('../../content/wiki/', '')
		.replace(/\.md$/, '')
		.replace(/\\/g, '/');
}

function titleFromSlug(slug: string) {
	const lastSegment = slug.split('/').at(-1) ?? slug;
	return decodeURIComponent(lastSegment).replace(/[-_]+/g, ' ').trim();
}

function stripFrontmatter(rawEntry: string) {
	return rawEntry.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function parseScalar(value: string) {
	return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseFrontmatter(rawEntry: string): WikiEntryFrontmatter {
	const match = rawEntry.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const frontmatter: WikiEntryFrontmatter = {};
	const lines = match[1].split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!keyValue) continue;

		const [, key, rawValue] = keyValue;
		const value = parseScalar(rawValue);

		if (key === 'tags') {
			if (value) {
				frontmatter.tags = value
					.replace(/^\[|\]$/g, '')
					.split(',')
					.map((item) => parseScalar(item))
					.filter(Boolean);
				continue;
			}

			const items: string[] = [];
			while (lines[index + 1]?.match(/^\s*-\s+/)) {
				index += 1;
				items.push(parseScalar(lines[index].replace(/^\s*-\s+/, '')));
			}
			frontmatter.tags = items;
			continue;
		}

		if (key === 'draft') {
			frontmatter.draft = value.toLowerCase() === 'true';
			continue;
		}

		if (['title', 'define', 'description', 'property'].includes(key)) {
			frontmatter[key as keyof Omit<WikiEntryFrontmatter, 'tags' | 'draft'>] = value;
		}
	}

	return frontmatter;
}

function plainBody(body: string) {
	return body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[\[[^\]]+\]\]/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[#>*_`~|[\]-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export async function getAllWikiEntries() {
	const entries = await Promise.all(
		Object.entries(wikiModules).map(async ([path, loadEntry]) => {
			const mod = await loadEntry();
			const rawEntry = rawWikiModules[path] ? await rawWikiModules[path]() : '';
			const slug = slugFromPath(path);
			const frontmatter = { ...parseFrontmatter(rawEntry), ...(mod.frontmatter ?? {}) };
			const body = stripFrontmatter(rawEntry);
			const definition = frontmatter.define ?? frontmatter.description ?? plainBody(body);

			return {
				slug,
				title: frontmatter.title ?? titleFromSlug(slug),
				frontmatter,
				definition,
				body,
				Content: mod.Content,
			};
		}),
	);

	return entries
		.filter((entry) => !entry.frontmatter.draft)
		.sort((a, b) => a.title.localeCompare(b.title, 'ko-KR'));
}

export function getWikiTags(entries: WikiEntry[]) {
	const tags = entries.flatMap((entry) => entry.frontmatter.tags ?? []);
	return [...new Set(tags.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko-KR'));
}

export function findWikiEntryByReference(entries: WikiEntry[], reference: string) {
	const normalizedReference = reference.toLowerCase();

	return entries.find((entry) => {
		const candidates = [entry.slug, entry.title, entry.slug.split('/').at(-1) ?? ''];
		return candidates.some((candidate) => candidate.toLowerCase() === normalizedReference);
	});
}
