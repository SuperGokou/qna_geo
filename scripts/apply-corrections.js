import fs from 'node:fs';
import { ROOT } from '../server/config.js';
import path from 'node:path';
const filename = path.join(ROOT, 'data/library.json');
const library = JSON.parse(fs.readFileSync(filename));
for (const correction of JSON.parse(fs.readFileSync(path.join(ROOT,'knowledge/page-corrections.json')))) {
  const chunk = library.chunks.find(c=>c.id===correction.id);
  if (!chunk) throw new Error('Unknown page');
  Object.assign(chunk,correction);
}
fs.writeFileSync(filename,JSON.stringify(library));
console.log('Applied visually verified page corrections.');
