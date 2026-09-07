import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../server/config.js';
const values = dotenv.parse(fs.readFileSync(path.join(ROOT, '.env')));
const secrets = Object.fromEntries(['DEEPSEEK_API_KEY', 'APP_PASSWORD', 'SESSION_SECRET'].map(k => [k, values[k]]));
if (!secrets.DEEPSEEK_API_KEY || !secrets.APP_PASSWORD || !secrets.SESSION_SECRET) throw new Error('Required credentials missing');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk', '--config', 'worker/wrangler.jsonc'], {
  cwd: ROOT, input: JSON.stringify(secrets), encoding: 'utf8',
  env: { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` },
});
if (result.status !== 0) { console.error('Secret upload failed. Check Cloudflare authorization.'); process.exit(1); }
console.log('Three server-only secrets stored in Cloudflare. Values were not logged.');
