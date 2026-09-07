import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { config } from '../server/config.js';
const require = createRequire('/Users/mingxia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.QA_URL || 'http://127.0.0.1:4317');
  await page.getByLabel('访问密码', { exact: true }).fill(config().password);
  await page.getByRole('button', { name: '进入工作台' }).click();
  await page.getByRole('tab', { name: '总部负责交付' }).waitFor();
  for (const name of ['使用我方品牌', '控制启动投入', '总部负责交付']) {
    await page.getByRole('tab', { name }).click();
    assert.equal(await page.getByRole('tab', { name }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.focus-vendor').count(), 3);
  }
  await page.getByRole('tab', { name: '控制启动投入' }).click();
  await page.locator('.meeting-questions summary').first().click();
  assert(await page.getByText('36,800 元包含哪些 GEO 产品与服务，费用是否含税？', { exact: true }).isVisible());
  assert.equal(await page.locator('.meeting-actions a').first().getAttribute('href'), '/api/documents/mf/file');
  await page.getByRole('button', { name: '继续追问', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('.composer textarea')?.value.includes('控制启动投入'));
  assert.match(await page.getByRole('textbox', { name: '向决策助手提问' }).inputValue(), /控制启动投入/);
  await page.screenshot({ path: 'tmp/decision-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '关闭助手', exact: true }).click();
  await page.screenshot({ path: 'tmp/decision-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Decision priorities, meeting questions, source links, contextual follow-up and mobile layout passed.');
} finally { await browser.close(); }
