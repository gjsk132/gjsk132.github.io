export interface IndexEntryFrontmatter {
	title?: string;
	define?: string;
	description?: string;
	tags?: string[];
	property?: string;
	draft?: boolean;
}

export interface IndexEntry {
	slug: string;
	title: string;
	frontmatter: IndexEntryFrontmatter;
	definition: string;
	body: string;
	Content: unknown;
}

interface IndexEntryModule {
	frontmatter: IndexEntryFrontmatter;
	Content: unknown;
}

const indexModules = import.meta.glob<IndexEntryModule>('../../content/index/**/*.md');
const rawIndexModules = import.meta.glob<string>('../../content/index/**/*.md', {
	query: '?raw',
	import: 'default',
});

function slugFromPath(path: string) {
	return path
		.replace('../../content/index/', '')
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

function parseFrontmatter(rawEntry: string): IndexEntryFrontmatter {
	const match = rawEntry.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const frontmatter: IndexEntryFrontmatter = {};
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
			frontmatter[key as keyof Omit<IndexEntryFrontmatter, 'tags' | 'draft'>] = value;
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

export async function getAllIndexEntries() {
	const entries = await Promise.all(
		Object.entries(indexModules).map(async ([path, loadEntry]) => {
			const mod = await loadEntry();
			const rawEntry = rawIndexModules[path] ? await rawIndexModules[path]() : '';
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

export function getIndexTags(entries: IndexEntry[]) {
	const tags = entries.flatMap((entry) => entry.frontmatter.tags ?? []);
	return [...new Set(tags.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko-KR'));
}

export function findIndexEntryByReference(entries: IndexEntry[], reference: string) {
	const normalizedReference = reference.toLowerCase();

	return entries.find((entry) => {
		const candidates = [entry.slug, entry.title, entry.slug.split('/').at(-1) ?? ''];
		return candidates.some((candidate) => candidate.toLowerCase() === normalizedReference);
	});
}
