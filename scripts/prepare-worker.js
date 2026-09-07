import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../server/config.js';
const assets = path.join(ROOT, 'worker/assets');
fs.mkdirSync(path.join(assets, 'parts'), { recursive: true });
fs.mkdirSync(path.join(assets, 'previews'), { recursive: true });
const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/library.json')));
fs.copyFileSync(path.join(ROOT, 'data/library.json'), path.join(assets, 'library.json'));
fs.copyFileSync(path.join(ROOT, 'data/reference-registry.json'), path.join(assets, 'references.json'));
const manifest = {};
for (const d of library.documents) {
  const bytes = fs.readFileSync(path.join(ROOT, 'private/documents', d.filename));
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += 8 * 1024 * 1024) {
    const name = `parts/${d.id}-${parts.length}.bin`;
    fs.writeFileSync(path.join(assets, name), bytes.subarray(offset, offset + 8 * 1024 * 1024)); parts.push(name);
  }
  manifest[d.id] = { filename: d.filename, parts, type: d.filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain; charset=utf-8' };
  if (d.preview) fs.copyFileSync(path.join(ROOT, 'public', d.preview), path.join(assets, 'previews', `${d.id}.webp`));
}
fs.writeFileSync(path.join(assets, 'manifest.json'), JSON.stringify(manifest));
console.log(`Prepared ${library.documents.length} protected documents.`);
