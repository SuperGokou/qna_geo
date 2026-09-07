import { z } from 'zod';
import { SYSTEM_PROMPT } from '../server/prompt.js';
import { isGeoQuestion, scopeRefusal } from './scope.js';

export const RequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(10).default([]),
  scope: z.enum(['all', 'mf', 'vigilath', 'aistar', 'brief', 'report', 'local', 'industrial', 'notes']).default('all'),
}).strict();
const AnswerSchema = z.object({
  summary: z.string().min(1).max(1800),
  points: z.array(z.object({ text: z.string().min(1).max(2000), type: z.enum(['confirmed', 'claim', 'analysis', 'unknown']), citations: z.array(z.string()).max(8) })).max(8),
  unknowns: z.array(z.string().max(800)).max(6).default([]),
  followups: z.array(z.string().max(150)).max(3).default([]),
});

export function validateAnswer(value, context, citation) {
  const result = AnswerSchema.parse(value);
  const allowed = new Map(context.map(c => [c.id, c]));
  for (const point of result.points) {
    point.citations = [...new Set(point.citations.filter(id => allowed.has(id)))];
    if (!point.citations.length) point.type = 'unknown';
    if (point.type === 'confirmed' && point.citations.some(id => allowed.get(id).type !== 'confirmed')) {
      point.type = point.citations.some(id => allowed.get(id).type === 'claim') ? 'claim' : 'analysis';
    }
  }
  const ids = [...new Set(result.points.flatMap(p => p.citations))];
  return { ...result, citations: ids.map(id => citation(allowed.get(id))) };
}

export function localAnswer(request, { search, citation }) {
  const hits = search(request.question, request.scope, 4);
  const curated = hits.filter(h => h.curated);
  const selected = curated.length ? curated.slice(0, 3) : hits.slice(0, 3);
  return {
    mode: 'local',
    summary: selected.length ? '找到以下相关资料。当前为本地检索，未调用 DeepSeek。' : '本地资料未找到足够匹配的内容，暂不能据此作出判断。',
    points: selected.map(c => ({ text: c.text.slice(0, c.curated ? 1200 : 550), type: c.type, citations: [c.id] })),
    citations: selected.map(citation),
    unknowns: ['资料中的宣传或假设不等同于已验证事实；当前未进行模型综合分析。'],
    followups: ['三家技术上哪家更匹配？', '80%利润具体是什么口径？', '签约前还要核实什么？'],
  };
}

export async function answer(request, settings, signal, transport = fetch, engine) {
  if (!isGeoQuestion(request.question, request.history)) return scopeRefusal();
  const { retrieve, citation } = engine;
  if (!settings.key) return localAnswer(request, engine);
  const context = retrieve(request.question, request.history, request.scope);
  const payload = {
    model: settings.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({
        projectDate: '2026-09-07', currentDate: new Date().toISOString().slice(0, 10),
        scope: request.scope, question: request.question, history: request.history,
        evidence: context.map(({ id, title, text, type, date, page }) => ({ id, title, text: text.slice(0, 3200), type, date, page })),
      }) },
    ],
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    max_tokens: 2800,
    stream: false,
  };
  const response = await transport('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal,
  });
  if (!response.ok) {
    const error = new Error([401, 403].includes(response.status) ? 'DeepSeek 密钥无效或无访问权限，请检查服务端配置。' : response.status === 402 ? 'DeepSeek 账户余额不足，请检查账户。' : response.status === 429 ? 'DeepSeek 请求过于频繁，请稍后重试。' : 'DeepSeek 服务暂时不可用，请稍后重试。');
    error.safe = true;
    throw error;
  }
  const data = await response.json();
  const result = validateAnswer(JSON.parse(data.choices?.[0]?.message?.content || ''), context, citation);
  return { ...result, mode: 'deepseek', model: settings.model };
}
