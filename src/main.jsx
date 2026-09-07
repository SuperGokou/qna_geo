import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Columns3, Library, ClipboardCheck, ChevronRight, ArrowUpRight, ArrowUp, FileText, Search, MessageSquare, Plus, X, Menu, PanelRightClose, Bot, Download, Copy, Check, Circle, ShieldCheck, RefreshCw, LockKeyhole, ExternalLink, Square, Trash2, Clock3, ArrowRight, Sparkles, SlidersHorizontal, BookOpen, LogOut, Mic, MicOff, Volume2, VolumeX, Radar } from 'lucide-react';
import { api, apiFetch, openDocument } from './client.js';
import { useVoiceInput, useReadAloud } from './voice.js';
import './styles.css';
import './theme.css';
const labels = {
  confirmed: '项目已确认',
  claim: '供应商口径',
  analysis: '分析判断',
  unknown: '待核实',
  mixed: '混合资料'
};
const vendors = [{
  id: 'mf',
  mark: 'M',
  name: '迈富时',
  en: 'Marketingforce · 珍岛集团',
  color: 'green',
  tag: '优先技术验证',
  headline: '平台能力与规模化交付',
  description: '知识库、内容生产与多平台监测，优先验证工业客户场景。',
  focus: 'GEO独立采购 / 多客户管理 / 数据导出',
  risk: '36,800元套餐是否包含GEO，尚未确认。',
  points: ['知识库与提示词管理', '企业智能体与内容流程', '代理权限和配额待验证']
}, {
  id: 'vigilath',
  mark: 'V',
  name: 'Vigilath',
  en: '上海超响应数字科技',
  color: 'blue',
  tag: '重点考察白标',
  headline: '自主品牌与定制合作',
  description: '监测、报告及白标定制主张，关注我方客户资产与交付控制。',
  focus: '多租户隔离 / 采样日志 / 定制维护',
  risk: '采样频率、授权和实际后台能力待核实。',
  points: ['监测与原始报告', '白标及私有化方案', '技术与渠道条款待核实']
}, {
  id: 'aistar',
  mark: 'A',
  name: '智星销',
  en: 'AIstarGEO · 上海同源元',
  color: 'amber',
  tag: '高价值专项备选',
  headline: '知识资产与深度运营',
  description: '多Agent与人工服务结合，适合验证复杂品牌的专项交付。',
  focus: '自动化程度 / 专家工时 / 资产迁移',
  risk: '原终端年约报价已过期，不等于渠道价格。',
  points: ['品牌知识资产建设', '多Agent与人工审核', '年度服务和成本待重谈']
}];
const tasks = [['product', '产品与代理授权', '明确36,800元对应产品、GEO范围，以及扬州与泰州是否分别授权。', '商务'], ['price', '同口径渠道报价', '三家分别列明订阅、人工、媒体、定制、超量、续费及退款。', '商务'], ['tenant', '多客户权限隔离', '同时开通两个客户，核对知识库、账号、报表、账单与导出。', '技术'], ['sampling', '真实采样与原始记录', '记录App/API、联网状态、时间、失败请求和引用来源。', '技术'], ['ownership', '客户归属与退出', '确认客户报备、绕单保护、续费分配、内容归属与迁移格式。', '合同'], ['cost', '单客户交付成本', '确认总部和本地责任、人天、服务时限及额外收费。', '财务'], ['proof', '案例与合作授权', '索取完整脱敏案例、授权期限、实际签约及收款主体。', '尽调'], ['pilot', '付费试点与验收', '固定问题集，形成基线、复测、真实询盘及续费记录。', '运营']];
const suggestions = ['三家技术上哪家更匹配？', '迈富时80%利润靠谱吗？', 'Vigilath白标需要验证什么？', '签约前还有哪些关键缺口？'];
function DocumentLink({
  href,
  children,
  ...props
}) {
  return <a href={href} {...props} onClick={e => {
    e.preventDefault();
    openDocument(href);
  }}>{children}</a>;
}
function SecureImage({
  src,
  alt,
  ...props
}) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let cancelled = false,
      blobUrl;
    apiFetch(src).then(r => {
      if (!r.ok) throw new Error('image');
      return r.blob();
    }).then(b => {
      blobUrl = URL.createObjectURL(b);
      if (!cancelled) setImage(blobUrl);else URL.revokeObjectURL(blobUrl);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);
  return image ? <img src={image} alt={alt} {...props} /> : <FileText size={25} />;
}
function IconButton({
  icon: Icon,
  label,
  ...props
}) {
  return <button type="button" className="icon-button" aria-label={label} title={label} {...props}><Icon size={17} /></button>;
}
function Badge({
  type = 'analysis',
  children
}) {
  return <span className={`badge ${type}`}>{children || labels[type]}</span>;
}
function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text], {
    type: 'text/markdown;charset=utf-8'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('overview');
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [source, setSource] = useState(null);
  const [toast, setToast] = useState('');
  const [ask, setAsk] = useState(null);
  const [loadError, setLoadError] = useState('');
  const notify = text => {
    setToast(text);
    setTimeout(() => setToast(''), 2800);
  };
  const refresh = async () => {
    try {
      const [d, s] = await Promise.all([api('/api/documents'), api('/api/status')]);
      setDocs(d);
      setStatus(s);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  };
  useEffect(() => {
    api('/api/session').then(setSession).catch(e => setLoadError(e.message));
  }, []);
  useEffect(() => {
    if (session?.authorized) {
      refresh();
      const id = setInterval(refresh, 30000);
      return () => clearInterval(id);
    }
  }, [session?.authorized]);
  useEffect(() => {
    const listener = e => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        setChatOpen(false);
        setSource(null);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const askQuestion = (text, scope = 'all') => {
    setAsk({
      text,
      scope,
      id: Date.now()
    });
    setChatOpen(true);
  };
  const navigate = next => {
    setPage(next);
    setNavOpen(false);
  };
  if (!session) return <div className="startup"><span className="brand-mark">G</span><p>{loadError || '正在载入决策资料…'}</p>{loadError && <button onClick={() => location.reload()}>重新加载</button>}</div>;
  if (!session.authorized) return <Login onLogin={() => setSession({
    authorized: true
  })} />;
  const nav = [['overview', LayoutDashboard, '决策概览'], ['compare', Columns3, '供应商对比'], ['library', Library, '资料与报告'], ['tasks', ClipboardCheck, '待核实事项']];
  return <div className="app">
    {navOpen && <button className="scrim nav-scrim" aria-label="关闭导航" onClick={() => setNavOpen(false)} />}
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <a className="brand" href="#" onClick={e => {
        e.preventDefault();
        navigate('overview');
      }}><span className="brand-mark">G</span><span>GEO<span className="brand-sub">决策工作台</span></span></a>
      <div className="workspace-label">区域合作研究 <span>2026</span></div>
      <nav>{nav.map(([key, Icon, title]) => <button key={key} className={page === key ? 'selected' : ''} onClick={() => navigate(key)}><Icon size={18} /><span>{title}</span>{key === 'library' && <small>{docs.length || 8}</small>}</button>)}</nav>
      <div className="sidebar-section"><span>候选伙伴</span>{vendors.map(v => <button key={v.id} onClick={() => {
          navigate('compare');
          document.getElementById(`vendor-${v.id}`)?.scrollIntoView({
            behavior: 'smooth'
          });
        }}><span className={`dot ${v.color}`} />{v.name}<ChevronRight size={13} /></button>)}</div>
      <div className="sidebar-bottom"><div className="region"><span className="region-line" />扬州 / 泰州<span className="region-sub">软件与服务 · 区域代理</span></div><div className="profile"><span className="avatar">肖</span><div>肖总<span>内部决策资料</span></div>{status?.passwordRequired && <IconButton icon={LogOut} label="退出登录" onClick={async () => {
            await api('/api/logout', {
              method: 'POST'
            });
            setSession({
              authorized: false
            });
          }} />}</div></div>
    </aside>
    <div className="work-area">
      <header className="topbar"><div className="breadcrumb"><IconButton icon={Menu} label="打开导航" className="icon-button mobile-menu" onClick={() => setNavOpen(true)} /><span>合作研究</span><ChevronRight size={13} /><strong>{nav.find(x => x[0] === page)?.[2]}</strong></div><div className="topbar-end"><span className="confidential"><LockKeyhole size={13} />内部资料</span><span className="date">2026.09.07</span><IconButton icon={MessageSquare} label="打开决策助手" className="icon-button mobile-chat" onClick={() => setChatOpen(true)} /></div></header>
      <main className="main-content">
        {loadError && <div className="error-banner">{loadError}<button onClick={refresh}>重新加载</button></div>}
        {page === 'overview' && <Overview docs={docs} status={status} navigate={navigate} ask={askQuestion} />}
        {page === 'compare' && <Comparison ask={askQuestion} />}
        {page === 'library' && <LibraryPage docs={docs} query={query} setQuery={setQuery} setSource={setSource} />}
        {page === 'tasks' && <Tasks notify={notify} />}
        <footer className="main-footer"><span>研究与编制 · Ming Xia</span><span>资料截至 2026.09.07</span></footer>
      </main>
    </div>
    {chatOpen && <button className="scrim chat-scrim" aria-label="关闭问答窗口" onClick={() => setChatOpen(false)} />}
    <Chat open={chatOpen} onClose={() => setChatOpen(false)} ask={ask} status={status} setSource={setSource} notify={notify} />
    {source && <SourceDrawer source={source} onClose={() => setSource(null)} />}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}
function Overview({
  docs,
  status,
  navigate,
  ask
}) {
  return <>
    <div className="page-heading"><div><div className="eyebrow">PARTNER INTELLIGENCE</div><h1>扬州 · 泰州 GEO 合作决策</h1><p>三家候选，一个区域合作方向。</p></div><span className="revision"><span />最新研究</span></div>
    <div className="metrics"><div><span>候选合作伙伴</span><strong>03<small>家</small></strong></div><div><span>已归档参考资料</span><strong>{String(docs.length || 8).padStart(2, '0')}<small>份</small></strong></div><div><span>PDF 原文覆盖</span><strong>{status?.pages || 182}<small>页</small></strong></div></div>
    <section className="decision"><div className="section-label"><span className="tiny-line" />当前决策摘要<Badge>有条件建议</Badge></div><h2>以技术能力为基准，<br />以可复制交付决定合作。</h2><p>迈富时优先进行技术验证；Vigilath重点考察白标与定制；智星销保留高价值专项机会。最终选择取决于实际后台、渠道条件和交付责任。</p><div className="decision-actions"><DocumentLink className="primary-button" href="/api/documents/brief/file" target="_blank" rel="noreferrer"><FileText size={16} />查看技术简报<ArrowUpRight size={15} /></DocumentLink><button className="text-button" onClick={() => navigate('compare')}>比较三家供应商<ArrowRight size={16} /></button></div><div className="decision-foot"><ShieldCheck size={14} />尚未完成后台实测；不构成效果排名或采购批准。</div></section>
    <section><div className="section-title"><h2>候选伙伴</h2><button className="text-button muted" onClick={() => navigate('compare')}>完整对比<ChevronRight size={14} /></button></div><div className="vendor-list">{vendors.map((v, i) => <button className="vendor-row" key={v.id} onClick={() => ask(`${v.name}的技术能力和区域代理匹配度如何？`, v.id)}><span className={`vendor-logo ${v.color}`}>{v.mark}</span><div className="vendor-info"><strong>{v.name}</strong><span>{v.headline}</span></div><span className={`vendor-tag ${v.color}`}>{v.tag}</span><ArrowUpRight size={17} /></button>)}</div></section>
    <section><div className="section-title"><h2>需要重点关注</h2><span className="small-label">3 项关键边界</span></div><div className="attention-list">{[['01', '80%是招商毛利口径，不是净利润', '36,800元产品范围、返佣与交付成本尚未确认。', '迈富时80%利润具体怎么算？'], ['02', '代理政策仍未形成同口径对比', 'Vigilath与智星销的渠道价格和地区授权待沟通。', '三家的代理价格可以直接比较吗？'], ['03', '扬州测算不能直接外推至泰州', '原市场报告早于两地业务范围确认。', '泰州市场规模目前有哪些依据？']].map(([n, title, detail, q]) => <button key={n} onClick={() => ask(q)}><span>{n}</span><div><strong>{title}</strong><p>{detail}</p></div><ArrowUpRight size={16} /></button>)}</div></section>
    <section><div className="section-title"><h2>决策报告</h2><button className="text-button muted" onClick={() => navigate('library')}>全部资料<ChevronRight size={14} /></button></div><div className="report-grid">{docs.filter(d => d.category === '决策报告').map(d => <DocumentLink className="report-tile" key={d.id} href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer"><div className="report-image"><SecureImage src={d.preview} alt={`${d.title}首页`} /><span>PDF · {d.pages} 页</span></div><div className="report-caption"><strong>{d.title}</strong><span>{d.date}<ArrowUpRight size={15} /></span></div></DocumentLink>)}</div></section>
  </>;
}
function Comparison({
  ask
}) {
  const [view, setView] = useState('tech');
  const rows = view === 'tech' ? [['核心产品形态', '知识库、内容引擎、多平台监测', 'GEO监测、报告、白标与定制主张', '知识资产、多Agent与人工运营'], ['行业适配判断', '复杂参数、工业选型与知识维护', '自主品牌服务及定制交付', '高价值、深度内容品牌专项'], ['规模化的前提', '代理后台、配额和独立GEO采购', '客户隔离、统一运维和稳定采样', '自动化比例、专家工时和成本'], ['数据与退出', '知识库、原始回答和内容可导出？', '白标报表与完整历史能取回？', '知识资产权属与迁移格式明确？'], ['尚缺的验证', '真实后台、GEO单项效果与SLA', '采样口径、授权与多租户实测', '批量软件交付及自动化能力']] : [['已有商务资料', '新增招商笔记，非正式合同', '尚未沟通有效代理政策', '有旧终端服务价，代理价未取得'], ['价格边界', '36,800元/套是否包含GEO待确认', '不能推断更便宜或利润更高', '旧季度2.5/6/10/27万元，已过期'], ['收益边界', '29,400元为招商毛利；净利待核算', '缺进货价、续费和交付成本', '年约及人工投入影响成本'], ['区域与客户', '两地授权、独家与客户保护待谈', '朋友关系不等于优惠或授权', '朋友关系不等于渠道条件'], ['采购前提', '产品清单、价目、考核及退款', '同口径报价、授权和服务承诺', '重新报价，区分终端价与渠道价']];
  return <><div className="page-heading"><div><div className="eyebrow">VENDOR COMPARISON</div><h1>供应商对比</h1><p>比较实际能力与合作条件，不以宣传标签代替验证。</p></div></div><div className="segmented" role="tablist" aria-label="比较维度"><button role="tab" aria-selected={view === 'tech'} className={view === 'tech' ? 'active' : ''} onClick={() => setView('tech')}>技术与交付</button><button role="tab" aria-selected={view === 'channel'} className={view === 'channel' ? 'active' : ''} onClick={() => setView('channel')}>渠道与商业</button></div><div className="table-scroll"><table className="comparison-table"><thead><tr><th>评估维度</th>{vendors.map(v => <th key={v.id}><span className={`dot ${v.color}`} />{v.name}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i}>{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div><div className="table-note"><ShieldCheck size={15} />功能描述来自供应商材料；匹配度为分析判断，尚未实测。</div>{vendors.map(v => <section className="vendor-detail" key={v.id} id={`vendor-${v.id}`}><div className="vendor-detail-title"><span className={`vendor-logo ${v.color}`}>{v.mark}</span><div><h2>{v.name}</h2><span>{v.en}</span></div><Badge type="claim">功能待验证</Badge></div><p>{v.description}</p><div className="detail-columns"><div><span className="small-label">重点能力</span>{v.points.map(p => <div className="detail-point" key={p}><Circle size={8} />{p}</div>)}</div><div><span className="small-label">采购前的技术门槛</span><p>{v.focus}</p><span className="risk-text">{v.risk}</span></div></div><button className="text-button" onClick={() => ask(`请简要分析${v.name}的技术风险与验收要点`, v.id)}>向助手追问<ArrowRight size={15} /></button></section>)}</>;
}
function LibraryPage({
  docs,
  query,
  setQuery,
  setSource
}) {
  const [filter, setFilter] = useState('全部');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [references, setReferences] = useState([]);
  useEffect(() => {
    api('/api/references').then(setReferences).catch(() => {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setBusy(false);
        return;
      }
      setBusy(true);
      setError('');
      api(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      }).then(setResults).catch(e => {
        if (e.name !== 'AbortError') setError(e.message);
      }).finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);
  const filtered = docs.filter(d => filter === '全部' || d.category === filter);
  return <><div className="page-heading"><div><div className="eyebrow">EVIDENCE LIBRARY</div><h1>资料与报告</h1><p>原始文件、决策分析与最新项目记录。</p></div></div><label className="searchbox"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="检索原文、报价、技术或合同条款…" aria-label="检索资料" />{query && <IconButton icon={X} label="清除检索" onClick={() => setQuery('')} />}</label>{query ? <section className="search-results"><div className="section-title"><h2>{busy ? '检索中…' : `相关片段 · ${results.length}`}</h2></div>{error && <p className="error-text">{error}</p>}{!busy && !results.length && <div className="empty-state"><Search size={26} /><h3>未找到匹配资料</h3><p>可改用供应商名称或具体条款关键词。</p></div>}{results.map(r => <button key={r.id} className="search-result" onClick={() => setSource(r)}><div><Badge type={r.type} /><span>{r.page ? `第 ${r.page} 页` : '项目记录'}</span></div><h3>{r.title}</h3><p>{r.excerpt.slice(0, 240)}</p><span className="text-button">查看依据<ArrowUpRight size={14} /></span></button>)}</section> : <><div className="filter-tabs">{['全部', '决策报告', '供应商材料', '业务背景', '项目记录'].map(f => <button key={f} onClick={() => setFilter(f)} className={f === filter ? 'active' : ''}>{f}</button>)}</div><div className="document-list">{filtered.map(d => <article key={d.id} className="document-row"><div className="document-preview">{d.preview ? <SecureImage src={d.preview} alt={`${d.title}封面`} loading="lazy" /> : <BookOpen size={27} />}</div><div className="document-info"><div className="document-kicker">{d.category}<span>{d.pages ? `${d.pages} 页` : '文本记录'}</span></div><h3>{d.title}</h3><p>{d.description}</p><span className="small-label">{d.date}</span></div><DocumentLink className="icon-button" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" title={`打开${d.title}`} aria-label={`打开${d.title}`}><ArrowUpRight size={19} /></DocumentLink></article>)}</div><details className="references"><summary>公开来源索引<span>{references.length} 项<ChevronRight size={15} /></span></summary><p className="small-label">沿用市场报告的引用记录，未实时更新网页。</p>{references.filter(r => r[3]).map(([id, title, date, url, description]) => <div className="reference-row" key={id}><a href={url} target="_blank" rel="noreferrer">{id} · {title}<ExternalLink size={12} /></a><p>{date} · {description}</p></div>)}</details></>}</>;
}
function Tasks({
  notify
}) {
  const [done, setDone] = useState(() => readLocal('geo-tasks', []));
  const [filter, setFilter] = useState('全部');
  const toggle = id => {
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    setDone(next);
    localStorage.setItem('geo-tasks', JSON.stringify(next));
  };
  const exportTasks = () => {
    downloadText('# GEO 待核实事项\n\n' + tasks.map(([id, title, body, owner]) => `- [${done.includes(id) ? 'x' : ' '}] ${title}（${owner}）：${body}`).join('\n'), 'GEO-待核实事项.md');
    notify('核实清单已导出');
  };
  return <><div className="page-heading"><div><div className="eyebrow">DUE DILIGENCE</div><h1>待核实事项</h1><p>将关键缺口落实到资料、演示与书面条款。</p></div><IconButton icon={Download} label="导出核实清单" onClick={exportTasks} /></div><div className="task-summary"><div><strong>{done.length}<span>/ {tasks.length}</span></strong><span>已跟进</span></div><p>勾选仅记录本机跟进进度，不改变资料的证据状态。</p></div><div className="filter-tabs">{['全部', '待跟进', '已跟进'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div><div className="task-list">{tasks.filter(([id]) => filter === '全部' || (filter === '已跟进' ? done.includes(id) : !done.includes(id))).map(([id, title, body, owner]) => <label className={`task ${done.includes(id) ? 'done' : ''}`} key={id}><input type="checkbox" checked={done.includes(id)} onChange={() => toggle(id)} /><div><h3>{title}</h3><p>{body}</p></div><span>{owner}</span></label>)}</div><section className="guardrail"><ShieldCheck size={21} /><div><h3>扩大投入之前</h3><p>原始交付可复算、客户愿意续费、贡献毛利覆盖获客成本。仅有推荐率上涨，不构成扩张依据。</p></div></section></>;
}
function Chat({
  open,
  onClose,
  ask,
  status,
  setSource,
  notify
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [scope, setScope] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const controller = useRef(null);
  const end = useRef(null);
  const inputRef = useRef(null);
  const [copied, setCopied] = useState(null);
  const voice = useVoiceInput({ text: input, setText: setInput, onError: setError });
  const speech = useReadAloud(setError);
  useEffect(() => {
    if (ask) {
      setInput(ask.text);
      setScope(ask.scope);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [ask]);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [messages, busy, error]);
  useEffect(() => () => controller.current?.abort(), []);
  const asText = answer => [answer.summary, ...answer.points.map(p => `${labels[p.type]}：${p.text}`), ...answer.unknowns.map(u => `待确认：${u}`), ...answer.citations.map(c => `来源：${c.title}${c.page ? `（第${c.page}页）` : ''}`)].join('\n\n');
  async function send(question = input) {
    if (!question.trim() || busy) return;
    voice.stop();
    if (status?.connected && !consent) {
      setError('请先确认本次会话的资料发送授权。');
      return;
    }
    const text = question.trim();
    setError('');
    setInput('');
    setLastQuestion(text);
    setBusy(true);
    const history = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.role === 'user' ? m.text : asText(m.answer).slice(0, 3500)
    }));
    setMessages(old => [...old, {
      role: 'user',
      text,
      id: crypto.randomUUID()
    }]);
    controller.current = new AbortController();
    try {
      const result = await api('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.current.signal,
        body: JSON.stringify({
          question: text,
          scope,
          history
        })
      });
      setMessages(old => [...old, {
        role: 'assistant',
        answer: result,
        id: crypto.randomUUID()
      }]);
    } catch (e) {
      setError(e.name === 'AbortError' ? '本次请求已停止。' : e.message);
    } finally {
      setBusy(false);
    }
  }
  const clear = () => {
    controller.current?.abort();
    voice.stop(); speech.stop();
    setMessages([]);
    setInput('');
    setError('');
    setLastQuestion('');
    notify('已开始新对话');
  };
  return <aside className={`chat-panel ${open ? 'open' : ''}`} aria-label="决策助手">
    <div className="chat-header"><span className="bot-symbol"><Bot size={20} /></span><div><strong>决策助手</strong><span><i className={status?.connected ? 'configured' : ''} />{status?.connected ? 'DeepSeek · 已配置' : '本地资料模式'}</span></div><IconButton icon={Plus} label="新建对话" onClick={clear} disabled={busy} /><IconButton icon={PanelRightClose} label="关闭助手" className="icon-button mobile-chat" onClick={onClose} /></div>
    <div className="chat-scope"><SlidersHorizontal size={14} /><label htmlFor="chat-scope">资料范围</label><select id="chat-scope" value={scope} onChange={e => setScope(e.target.value)}><option value="all">全部项目资料</option><option value="mf">迈富时</option><option value="vigilath">Vigilath</option><option value="aistar">智星销</option><option value="brief">技术简报</option><option value="report">市场报告</option></select></div>
    <div className="chat-body" aria-live="polite">
      {!messages.length && <div className="chat-welcome"><span className="welcome-icon"><Sparkles size={25} /></span><div className="eyebrow">DECISION ASSISTANT</div><h2>肖总，您好。</h2><p>今天想先了解哪一个<br />合作决策问题？</p><div className="suggestions">{suggestions.map(q => <button key={q} onClick={() => {
            setInput(q);
            inputRef.current?.focus();
          }}>{q}<ArrowUpRight size={14} /></button>)}</div><div className="chat-basis"><BookOpen size={15} /><div><strong>{status?.documents || 8} 份项目资料</strong><span>技术简报 · 供应商方案 · 招商笔记</span></div></div></div>}
      {messages.map(m => m.role === 'user' ? <div key={m.id} className="user-message">{m.text}</div> : <article className="assistant-message" key={m.id}><div className="answer-top"><Bot size={16} /><strong>{m.answer.mode === 'scope' ? '范围检查' : m.answer.mode === 'local' ? '本地资料检索' : '决策分析'}</strong><span>{m.answer.mode === 'deepseek' ? 'DeepSeek' : '未调用模型'}</span></div><p className="answer-summary">{m.answer.summary}</p>{m.answer.points.map((point, i) => <div className="answer-point" key={i}><Badge type={point.type} /><p>{point.text}</p><div className="citation-links">{point.citations.map(id => {
              const c = m.answer.citations.find(c => c.id === id);
              return c && <button key={id} onClick={() => setSource(c)}><FileText size={12} />{c.page ? `依据 · 第${c.page}页` : '项目依据'}<ArrowUpRight size={11} /></button>;
            })}</div></div>)}{m.answer.unknowns.length > 0 && <div className="answer-unknown"><strong>仍需确认</strong><ul>{m.answer.unknowns.map((u, i) => <li key={i}>{u}</li>)}</ul></div>}<div className="answer-actions"><IconButton icon={copied === m.id ? Check : Copy} label="复制回答" onClick={async () => {
            try {
              await navigator.clipboard.writeText(asText(m.answer));
              setCopied(m.id);
              setTimeout(() => setCopied(null), 1500);
            } catch {
              notify('复制未获授权，请使用导出');
            }
          }} /><IconButton icon={Download} label="导出回答" onClick={() => downloadText(asText(m.answer), 'GEO-问答记录.md')} /><IconButton icon={speech.reading === m.id ? VolumeX : Volume2} label={speech.reading === m.id ? '停止朗读' : '朗读回答'} onClick={() => speech.read(m.id, asText(m.answer))}/></div>{m.answer.followups.length > 0 && <div className="followups">{m.answer.followups.map(q => <button key={q} onClick={() => {
            setInput(q);
            inputRef.current?.focus();
          }}>{q}<ArrowRight size={12} /></button>)}</div>}</article>)}
      {busy && <div className="thinking"><span className="pulse-dot" /><span>{status?.connected ? '正在检索资料并核对回答…' : '正在检索项目资料…'}</span></div>}
      {error && <div className="chat-error" role="alert"><p>{error}</p>{lastQuestion && !busy && <button onClick={() => send(lastQuestion)}><RefreshCw size={13} />重试</button>}</div>}<div ref={end} />
    </div>
    <div className="composer-area">{status?.connected && !consent && <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>同意将问题、近期对话及相关资料片段发送至 DeepSeek。</span></label>}<form className="composer" onSubmit={e => {
        e.preventDefault();
        send();
      }}><textarea aria-label="向决策助手提问" ref={inputRef} value={input} maxLength={2000} onChange={e => setInput(e.target.value)} placeholder="向助手提问…" rows={3} onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }} /><div><span>{voice.listening ? '正在聆听…' : input.length > 1700 ? `${input.length}/2000` : '仅 GEO 项目问题'}</span><div className="composer-tools"><IconButton icon={voice.listening ? MicOff : Mic} label={voice.listening ? '停止语音输入' : '语音输入（浏览器识别服务）'} onClick={voice.toggle} disabled={busy}/>{busy ? <button type="button" className="send-button" onClick={() => controller.current?.abort()} aria-label="停止回答" title="停止回答"><Square size={15} /></button> : <button className="send-button" type="submit" disabled={!input.trim()} aria-label="发送问题" title="发送问题"><ArrowUp size={19} /></button>}</div></div></form><p className="composer-note"><ShieldCheck size={12} />{status?.connected ? '肖总专用 · 回答附依据，缺口不推断' : '仅本地检索 · 未连接外部模型'}</p></div>
  </aside>;
}
function SourceDrawer({
  source,
  onClose
}) {
  const close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const trap = event => {
      if (event.key !== 'Tab') return;
      const nodes = [...close.current.closest('[role="dialog"]').querySelectorAll('button, a[href], input')];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={onClose}><section className="source-drawer" role="dialog" aria-modal="true" aria-label="引用依据" onClick={e => e.stopPropagation()}><div className="source-header"><span><FileText size={17} />引用依据</span><button ref={close} className="icon-button" aria-label="关闭引用" onClick={onClose}><X size={18} /></button></div><Badge type={source.type} /><h2>{source.title}</h2><p className="small-label">{source.date} {source.page ? `· 第 ${source.page} 页` : '· 项目记录'}</p><blockquote>{source.excerpt}</blockquote><DocumentLink className="primary-button" href={source.href} target="_blank" rel="noreferrer">打开原始资料<ArrowUpRight size={16} /></DocumentLink><p className="source-note">摘录仅用于定位依据，完整上下文以原文为准。</p></section></div>;
}
function Login({
  onLogin
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="login"><div className="login-content"><span className="brand-mark">G</span><div className="eyebrow">GEO · PRIVATE WORKSPACE</div><h1>进入决策工作台</h1><p>扬州 / 泰州区域合作研究</p><form onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          await api('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              password
            })
          });
          onLogin();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}><label htmlFor="password">访问密码</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />{error && <p className="error-text" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? '验证中…' : '进入工作台'}<ArrowRight size={16} /></button></form><span className="small-label">内部资料 · Ming Xia</span></div></main>;
}
createRoot(document.getElementById('root')).render(<App />);
