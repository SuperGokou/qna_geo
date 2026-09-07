import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function config() {
  const local = fs.existsSync(path.join(ROOT, '.env')) ? dotenv.parse(fs.readFileSync(path.join(ROOT, '.env'))) : {};
  const env = { ...process.env, ...local };
  return {
    key: (env.DEEPSEEK_API_KEY || '').trim(),
    model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    port: Number(env.PORT) || 4317,
    host: env.HOST || '127.0.0.1',
    password: env.APP_PASSWORD || '',
    publicOrigin: env.PUBLIC_ORIGIN || '',
  };
}
