import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire('/Users/mingxia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let sessionRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/session')) sessionRequests++; });
  // Leave all remote requests pending, simulating an unreachable backend.
  await page.route('https://qna-geo-api.supergokou-geo.workers.dev/**', () => {});
  await page.goto(process.env.QA_URL || 'https://supergokou.github.io/qna_geo/');
  await page.getByLabel('访问密码', { exact: true }).waitFor({ timeout: 5000 });
  assert.equal(sessionRequests, 0);
  await page.getByLabel('访问密码', { exact: true }).fill('connectivity-test');
  await page.getByRole('button', { name: '进入工作台' }).click();
  await page.getByRole('alert').filter({ hasText: '连接服务超时' }).waitFor({ timeout: 20000 });
  assert(await page.getByRole('button', { name: '进入工作台' }).isEnabled());
  await page.screenshot({ path: 'tmp/network-timeout.png' });
  console.log('Mobile unreachable-backend test passed: immediate login, bounded timeout, retry enabled.');
} finally {
  await browser.close();
}
