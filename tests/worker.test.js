import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../worker/index.js';
const env = {
  APP_PASSWORD:'test-password-not-real',SESSION_SECRET:'a-long-test-signing-secret',ALLOWED_ORIGIN:'https://supergokou.github.io',
  LOGIN_LIMITER:{limit:async()=>({success:true})},CHAT_LIMITER:{limit:async()=>({success:true})},
  ASSETS:{fetch:async url=>{
    const pathname = new URL(url).pathname;
    const name = pathname === '/references.json' ? 'reference-registry.json' : 'library.json';
    if (pathname === '/manifest.json') return Response.json({});
    return new Response(fs.readFileSync(`data/${name}`));
  }},
};
test('Worker protects raw assets and supports authenticated cross-origin Pages requests',async()=>{
  const invoke = (path,options={})=>worker.fetch(new Request('https://test.workers.dev'+path,options),env);
  assert.equal((await invoke('/library.json')).status,401);
  assert.equal((await invoke('/api/documents')).status,401);
  assert.equal((await invoke('/api/session',{headers:{Origin:'https://evil.test'}})).status,403);
  const preflight = await invoke('/api/chat',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGIN}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
  const login = await invoke('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:env.APP_PASSWORD})});
  const {token}=await login.json();assert(token);
  const response = await invoke('/api/documents',{headers:{Authorization:`Bearer ${token}`,Origin:env.ALLOWED_ORIGIN}});
  assert.equal(response.status,200);assert.equal((await response.json()).length,8);
});
