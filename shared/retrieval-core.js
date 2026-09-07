import MiniSearch from 'minisearch';
export const tokenize = text => {
  const lower = String(text).toLowerCase();
  const tokens = lower.match(/[a-z0-9]+(?:\.[0-9]+)?/g) || [];
  for (const word of lower.match(/[\p{Script=Han}]+/gu) || []) {
    if (word.length === 1) tokens.push(word);
    for (let i = 0; i < word.length - 1; i++) tokens.push(word.slice(i, i + 2));
  }
  return tokens;
};
export function makeEngine(library) {
const documents = library.documents;
const byId = new Map(library.chunks.map(c => [c.id, c]));
const index = new MiniSearch({ fields: ['title', 'tags', 'text'], storeFields: ['title'], tokenize,
  searchOptions: { boost: { title: 3, tags: 3 }, combineWith: 'OR' } });
index.addAll(library.chunks);

function search(query, scope = 'all', limit = 8) {
  const aliases = String(query).replace(/珍岛|marketingforce/gi, '迈富时').replace(/威吉力/gi, 'Vigilath').replace(/aistargeo/gi, '智星销');
  const hits = index.search(aliases).map(h => ({ ...byId.get(h.id), score: h.score }));
  return hits.filter(c => scope === 'all' || c.documentId === scope || c.documentId === 'notes')
    .map(c => ({ ...c, score: c.score * (c.curated ? 2.6 : 1) }))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

function retrieve(question, history = [], scope = 'all') {
  const previous = history.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
  const primary = search(question, scope, 6);
  const followup = previous ? search(`${question} ${previous}`, scope, 3) : [];
  const pinned = ['scope', 'recommendation', 'channel-gap'].map(id => byId.get(id)).filter(Boolean);
  return [...new Map([...pinned, ...primary, ...followup].map(c => [c.id, c])).values()].slice(0, 12);
}

function citation(chunk) {
  const doc = documents.find(d => d.id === chunk.documentId);
  return { id: chunk.id, documentId: chunk.documentId, page: chunk.page || null,
    title: chunk.title, type: chunk.type, date: chunk.date,
    excerpt: chunk.text.slice(0, 1200),
    href: `/api/documents/${doc.id}/file${chunk.page ? `#page=${chunk.page}` : ''}` };
}
return { documents, byId, search, retrieve, citation };
}
