export interface WikiEntryFrontmatter {
	title?: string;
	define?: string;
	defines?: WikiDefinitionInput[];
	description?: string;
	property?: string;
	tags?: string[] | string;
	draft?: boolean;
}

export interface WikiDefinition {
	title: string;
	define: string;
}

type WikiDefinitionInput = string | Record<string, string> | WikiDefinition;

export interface WikiEntry {
	slug: string;
	title: string;
	frontmatter: WikiEntryFrontmatter;
	definition: string;
	definitions: WikiDefinition[];
	tags: string[];
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

function parseInlineList(value: string) {
	const bracketMatch = value.match(/^\[(.*)\]$/);
	if (!bracketMatch) return [];

	return bracketMatch[1]
		.split(',')
		.map((item) => parseScalar(item))
		.filter(Boolean);
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

		if (key === 'defines') {
			const items: WikiDefinitionInput[] = [];
			while (lines[index + 1]?.match(/^\s*-\s+/)) {
				index += 1;
				const item = lines[index].replace(/^\s*-\s+/, '');
				const itemMatch = item.match(/^([^:]+):\s*(.*)$/);

				if (itemMatch) {
					const [, title, define] = itemMatch;
					items.push({ [parseScalar(title)]: parseScalar(define) });
				} else {
					items.push(parseScalar(item));
				}
			}
			frontmatter.defines = items;
			continue;
		}

		if (key === 'tags') {
			const items = parseInlineList(value);

			while (lines[index + 1]?.match(/^\s*-\s+/)) {
				index += 1;
				items.push(parseScalar(lines[index].replace(/^\s*-\s+/, '')));
			}

			frontmatter.tags = items.length > 0 ? items : value ? [value] : [];
			continue;
		}

		if (key === 'draft') {
			frontmatter.draft = value.toLowerCase() === 'true';
			continue;
		}

		if (['title', 'define', 'description', 'property'].includes(key)) {
			frontmatter[key as keyof Omit<WikiEntryFrontmatter, 'draft'>] = value;
		}
	}

	return frontmatter;
}

function normalizeTags(tags: WikiEntryFrontmatter['tags']) {
	if (!tags) return [];
	const items = Array.isArray(tags) ? tags : [tags];

	return [...new Set(items.map((tag) => String(tag).trim()).filter(Boolean))];
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

function normalizeDefinitions(defines: WikiEntryFrontmatter['defines']): WikiDefinition[] {
	if (!defines) return [];
	const items = Array.isArray(defines) ? defines : [defines];

	return items
		.flatMap((item) => {
			if (!item) return [];

			if (typeof item === 'string') {
				const [title, ...defineParts] = item.split(':');
				const define = defineParts.join(':');
				if (!title || !define) return [];
				return [{ title: title.trim(), define: define.trim() }];
			}

			if ('title' in item && 'define' in item) {
				return [{ title: String(item.title).trim(), define: String(item.define).trim() }];
			}

			return Object.entries(item).map(([title, define]) => ({
				title: title.trim(),
				define: String(define).trim(),
			}));
		})
		.filter((definition) => definition.title && definition.define);
}

export async function getAllWikiEntries() {
	const entries = await Promise.all(
		Object.entries(wikiModules).map(async ([path, loadEntry]) => {
			const mod = await loadEntry();
			const rawEntry = rawWikiModules[path] ? await rawWikiModules[path]() : '';
			const slug = slugFromPath(path);
			const frontmatter = { ...parseFrontmatter(rawEntry), ...(mod.frontmatter ?? {}) };
			const body = stripFrontmatter(rawEntry);
			const definitions = normalizeDefinitions(frontmatter.defines);
			const definition = definitions[0]?.define ?? frontmatter.define ?? frontmatter.description ?? plainBody(body);
			const tags = normalizeTags(frontmatter.tags);

			return {
				slug,
				title: frontmatter.title ?? titleFromSlug(slug),
				frontmatter,
				definition,
				definitions,
				tags,
				body,
				Content: mod.Content,
			};
		}),
	);

	return entries
		.filter((entry) => !entry.frontmatter.draft)
		.sort((a, b) => a.title.localeCompare(b.title, 'ko-KR'));
}

export function findWikiEntryByReference(entries: WikiEntry[], reference: string) {
	const normalizedReference = reference.toLowerCase();

	return entries.find((entry) => {
		const candidates = [entry.slug, entry.title, entry.slug.split('/').at(-1) ?? '', ...entry.tags];
		return candidates.some((candidate) => candidate.toLowerCase() === normalizedReference);
	});
}
