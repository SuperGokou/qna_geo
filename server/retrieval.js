import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';
import { makeEngine } from '../shared/retrieval-core.js';
export { tokenize } from '../shared/retrieval-core.js';
export const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/library.json'), 'utf8'));
export const engine = makeEngine(library);
export const { documents, byId, search, retrieve, citation } = engine;
