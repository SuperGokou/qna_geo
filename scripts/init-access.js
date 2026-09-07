import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { ROOT } from '../server/config.js';
const file = path.join(ROOT, '.env');
let raw = fs.readFileSync(file, 'utf8');
const values = dotenv.parse(raw);
for (const key of ['APP_PASSWORD', 'SESSION_SECRET']) {
  if (values[key]?.length >= 12) continue;
  values[key] = crypto.randomBytes(key === 'APP_PASSWORD' ? 12 : 32).toString('base64url');
  const expression = new RegExp(`^${key}=.*$`, 'm');
  if (expression.test(raw)) raw = raw.replace(expression, `${key}=${values[key]}`);
  else raw += `\n${key}=${values[key]}\n`;
}
fs.writeFileSync(file, raw, { mode: 0o600 }); fs.chmodSync(file, 0o600);
fs.writeFileSync(path.join(ROOT, '.access.txt'), `肖总专用 GEO 工作台\n访问密码：${values.APP_PASSWORD}\n\n密钥与访问密码不进入 GitHub。请通过私下渠道将访问密码发给肖总。\n`, { mode: 0o600 });
console.log('Access credentials prepared locally. No secret values printed.');
