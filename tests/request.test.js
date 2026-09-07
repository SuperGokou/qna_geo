import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../src/request.js';

test('network deadline covers an unreachable endpoint', async t => {
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(requestJson('https://example.test', {}, 10), /连接服务超时/);
});
test('deadline also covers a stalled response body', async t => {
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => ({ json: () => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }) }));
  await assert.rejects(requestJson('https://example.test', {}, 10), /连接服务超时/);
});
test('caller cancellation and successful responses are preserved', async t => {
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    signal.throwIfAborted();
    return new Response(JSON.stringify({ ok: true }));
  });
  assert.deepEqual((await requestJson('https://example.test')).data, { ok: true });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestJson('https://example.test', { signal: controller.signal }), { name: 'AbortError' });
});
