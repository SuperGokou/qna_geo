import { makeEngine } from '../shared/retrieval-core.js';
import { RequestSchema, answer } from '../shared/chat-core.js';

const enc = new TextEncoder();
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
async function signingKey(env) { return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function sign(data, env) { return hex(await crypto.subtle.sign('HMAC', await signingKey(env), enc.encode(data))); }
async function authenticated(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (token.length > 1000) return false;
  const [body, signature] = token.split('.');
  if (!body || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  try {
    const bytes = Uint8Array.from(signature.match(/../g), b => parseInt(b, 16));
    if (!await crypto.subtle.verify('HMAC', await signingKey(env), bytes, enc.encode(body))) return false;
    const value = JSON.parse(atob(body));
    return value.exp > Date.now() && value.passwordVersion === await sign(env.APP_PASSWORD, env);
  } catch { return false; }
}
let loaded;
async function evidence(env) {
  if (!loaded) loaded = (async () => {
    const read = async name => { const response = await env.ASSETS.fetch(`https://assets.internal/${name}`); if (!response.ok) throw new Error('Library unavailable'); return response.json(); };
    const library = await read('library.json');
    return { library, engine: makeEngine(library), manifest: await read('manifest.json'), references: await read('references.json') };
  })().catch(error => { loaded = undefined; throw error; });
  return loaded;
}

async function handle(request, env) {
  const route = new URL(request.url).pathname;
  if (!env.APP_PASSWORD || env.APP_PASSWORD.length < 12 || !env.SESSION_SECRET) return json({ error: '服务端访问保护尚未配置。' }, 503);
  if (route === '/api/session' && request.method === 'GET') return json({ authorized: await authenticated(request, env), passwordRequired: true });
  if (route === '/api/login' && request.method === 'POST') {
    if (!(await env.LOGIN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'shared' })).success) return json({ error: '尝试过于频繁，请一分钟后再试。' }, 429);
    const data = await request.json();
    if (typeof data.password !== 'string' || data.password.length > 200) return json({ error: '访问密码不正确。' }, 401);
    const expected = await sign(env.APP_PASSWORD, env), received = await sign(data.password, env);
    let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
    if (diff) return json({ error: '访问密码不正确。' }, 401);
    const body = btoa(JSON.stringify({ exp: Date.now() + 2 * 3600000, nonce: crypto.randomUUID(), passwordVersion: expected }));
    return json({ ok: true, token: `${body}.${await sign(body, env)}` });
  }
  if (!await authenticated(request, env)) return json({ error: '请先输入访问密码。' }, 401);
  if (route === '/api/logout' && request.method === 'POST') return json({ ok: true });
  const { library, engine, manifest, references } = await evidence(env);
  if (route === '/api/status') return json({ connected: !!env.DEEPSEEK_API_KEY, mode: env.DEEPSEEK_API_KEY ? 'deepseek' : 'local', model: env.DEEPSEEK_MODEL, documents: library.documents.length, pages: library.documents.reduce((n, d) => n + d.pages, 0), chunks: library.chunks.length, updated: '2026-09-07', passwordRequired: true });
  if (route === '/api/documents') return json(library.documents.map(({ filename, ...d }) => ({ ...d, preview: d.preview ? `/api/previews/${d.id}` : null })));
  if (route === '/api/references') return json(references);
  if (route === '/api/search') { const url = new URL(request.url); return json(engine.search((url.searchParams.get('q') || '').slice(0, 1000), url.searchParams.get('scope') || 'all', 10).map(engine.citation)); }
  const preview = route.match(/^\/api\/previews\/([a-z]+)$/);
  if (preview && library.documents.some(d => d.id === preview[1])) return env.ASSETS.fetch(`https://assets.internal/previews/${preview[1]}.webp`);
  const file = route.match(/^\/api\/documents\/([a-z]+)\/file$/);
  if (file) {
    const doc = manifest[file[1]];
    if (!doc) return json({ error: '资料不存在。' }, 404);
    let part = 0, reader;
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            if (!reader) {
              if (part === doc.parts.length) { controller.close(); return; }
              const response = await env.ASSETS.fetch(`https://assets.internal/${doc.parts[part++]}`);
              if (!response.ok) throw new Error('Missing document part');
              reader = response.body.getReader();
            }
            const { done, value } = await reader.read();
            if (done) { reader = null; continue; }
            controller.enqueue(value); return;
          }
        } catch (error) { controller.error(error); }
      }, cancel() { return reader?.cancel(); },
    });
    return new Response(stream, { headers: { 'Content-Type': doc.type, 'Content-Disposition': `inline; filename="${doc.filename}"` } });
  }
  if (route === '/api/chat' && request.method === 'POST') {
    if (!(await env.CHAT_LIMITER.limit({ key: 'workspace-global' })).success) return json({ error: '提问较为频繁，请一分钟后重试。' }, 429);
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: '请输入不超过2000字的问题，或开始新对话。' }, 400);
    try { return json(await answer(parsed.data, { key: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL }, AbortSignal.timeout(60000), fetch, engine)); }
    catch (error) { return json({ error: error.safe ? error.message : '模型回答暂未通过校验或请求超时，请稍后重试。' }, 502); }
  }
  return json({ error: '接口不存在。' }, 404);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim());
    if (origin && !allowed.includes(origin)) return json({ error: '不允许的来源。' }, 403);
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin' };
    if (origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    let response;
    try {
      if (request.method === 'POST') {
        const body = await request.text();
        if (enc.encode(body).length > 32768) response = json({ error: '请求过大。' }, 413);
        else response = await handle(new Request(request.url, { method: 'POST', headers: request.headers, body }), env);
      } else response = await handle(request, env);
    } catch { response = json({ error: '服务暂时不可用，请稍后重试。' }, 500); }
    const result = new Response(response.body, response);
    for (const [k, v] of Object.entries(headers)) result.headers.set(k, v);
    return result;
  },
};
