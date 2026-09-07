import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ROOT, config } from './config.js';
import { documents, library, search, citation } from './retrieval.js';
import { RequestSchema, answer } from './chat.js';

export function createApp({ getConfig = config, transport = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: null,
  } }, crossOriginEmbedderPolicy: false }));
  const addresses = new Set(['localhost', '127.0.0.1', '[::1]', ...Object.values(os.networkInterfaces()).flat().map(i => i.address)]);
  app.use((req, res, next) => {
    const settings = getConfig();
    const publicUrl = settings.publicOrigin ? new URL(settings.publicOrigin) : null;
    if (!addresses.has(req.hostname) && req.hostname !== publicUrl?.hostname) return res.status(403).json({ error: '不允许的访问地址。' });
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin) {
      const allowed = publicUrl?.origin || `http://${req.get('host')}`;
      if (req.headers.origin !== allowed) return res.status(403).json({ error: '跨站请求已拒绝。' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  const sessions = new Map();
  const hash = s => crypto.createHash('sha256').update(s).digest();
  const authorized = req => {
    const settings = getConfig();
    if (!settings.password) return settings.host === '127.0.0.1' || settings.host === 'localhost';
    const token = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('geo_session='))?.slice(12);
    const session = sessions.get(token);
    return !!session && session.until > Date.now() && session.passwordHash === hash(settings.password).toString('hex');
  };
  const cleanup = setInterval(() => { for (const [id, s] of sessions) if (s.until < Date.now()) sessions.delete(id); }, 60000);
  cleanup.unref();
  app.get('/api/session', (req, res) => res.json({ authorized: authorized(req), passwordRequired: !!getConfig().password }));
  app.post('/api/login', rateLimit({ windowMs: 900000, limit: 10, message: { error: '尝试过于频繁，请稍后再试。' } }), (req, res) => {
    const settings = getConfig();
    if (typeof req.body?.password !== 'string' || !settings.password || !crypto.timingSafeEqual(hash(req.body.password), hash(settings.password))) return res.status(401).json({ error: '访问密码不正确。' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { until: Date.now() + 8 * 3600000, passwordHash: hash(settings.password).toString('hex') });
    res.cookie('geo_session', token, { httpOnly: true, sameSite: 'strict', secure: settings.publicOrigin.startsWith('https:'), maxAge: 8 * 3600000 });
    res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => {
    const token = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('geo_session='))?.slice(12);
    sessions.delete(token); res.clearCookie('geo_session'); res.json({ ok: true });
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!authorized(req)) return res.status(401).json({ error: '请先输入访问密码。' });
    next();
  });
  app.get('/api/status', (req, res) => {
    const settings = getConfig();
    res.json({ connected: !!settings.key, model: settings.model, mode: settings.key ? 'deepseek' : 'local',
      documents: documents.length, pages: documents.reduce((sum, d) => sum + d.pages, 0),
      chunks: library.chunks.length, updated: '2026-09-07', passwordRequired: !!settings.password });
  });
  app.get('/api/documents', (req, res) => res.json(documents.map(({ filename, ...d }) => d)));
  app.get('/api/references', (req, res) => res.json(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-registry.json'), 'utf8'))));
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').slice(0, 1000);
    const scope = String(req.query.scope || 'all');
    res.json(q.trim() ? search(q, scope, 10).map(citation) : []);
  });
  app.get('/api/documents/:id/file', (req, res) => {
    const doc = documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: '资料不存在。' });
    res.set('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path.join(ROOT, 'private/documents', doc.filename));
  });
  app.post('/api/chat', rateLimit({ windowMs: 900000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: '本轮提问次数较多，请稍后再试。' } }), async (req, res) => {
    const validated = RequestSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json({ error: '请输入不超过2000字的问题；对话长度或资料范围不符合要求。' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const result = await answer(validated.data, getConfig(), controller.signal, transport);
      if (!res.destroyed) res.json(result);
    } catch (error) {
      if (!res.destroyed) res.status(502).json({ error: error.name === 'AbortError' ? '请求超时，请缩短问题后重试。' : error.safe ? error.message : '模型回答格式未通过校验，本次未显示未经校验的内容，请重试。' });
    } finally { clearTimeout(timer); }
  });
  app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在。' }));
  app.use('/previews', (req, res, next) => authorized(req) ? next() : res.status(401).end());
  app.use(express.static(path.join(ROOT, 'dist'), { dotfiles: 'deny' }));
  app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'dist/index.html')));
  app.use((error, req, res, next) => res.status(error.status === 413 ? 413 : 400).json({ error: '请求格式无效或内容过大。' }));
  return app;
}
