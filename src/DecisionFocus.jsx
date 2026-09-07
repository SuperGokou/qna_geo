import React, { useState } from 'react';
import { ArrowRight, Check, Copy, FileText, ChevronDown } from 'lucide-react';

const priorities = [
  { id: 'delivery', label: '总部负责交付', note: '重点核实谁负责服务、需要多少本地人力，以及交付如何验收。', rows: [
    ['平台与规模化交付是主要考察方向。', '总部与本地的责任、人天及服务时限未明确。', ['总部负责哪些交付环节，本地需要配置什么岗位？', '能否提供一个完整案例及对应的人天、验收标准？']],
    ['监测与定制方案需结合实际后台验证。', '定制维护、采样稳定性及服务承诺待确认。', ['监测与定制由谁维护，失败请求如何处理？', '客户增加后，服务配额与维护费用如何变化？']],
    ['多 Agent 与人工服务结合，需核算实际投入。', '自动化比例、专家工时和批量交付能力待核实。', ['每个客户需要多少专家工时，哪些流程已自动化？', '服务边界、超量收费与验收条件分别是什么？']]
  ] },
  { id: 'brand', label: '使用我方品牌', note: '白标不等于客户资产归我方，需把权限、归属和退出条件分别确认。', rows: [
    ['先核对代理权限和多客户管理能力。', '白标授权、客户归属和数据导出条件待确认。', ['能否使用我方品牌，授权包含哪些页面与报告？', '两个客户的权限如何隔离，退出后可导出哪些数据？']],
    ['白标与定制是材料中的重点主张。', '需实测客户隔离，并明确历史记录和维护责任。', ['能否现场演示两个客户的隔离和白标报告？', '终止合作后，客户资料及历史报告如何完整迁移？']],
    ['重点核对品牌知识资产的权属。', '是否提供代理白标及完整迁移格式尚不明确。', ['知识资产、账号和内容的所有权归谁？', '能否提供白标交付，以及可迁移的数据格式清单？']]
  ] },
  { id: 'cost', label: '控制启动投入', note: '三家缺少同口径渠道报价，目前不能判断哪家更便宜或净利润更高。', rows: [
    ['已有 36,800 元套餐的招商口径。', '是否含 GEO、总部收费及本地成本仍待确认。', ['36,800 元包含哪些 GEO 产品与服务，费用是否含税？', '29,400 元毛利口径如何结算，另有哪些获客与交付成本？']],
    ['尚未取得有效代理政策。', '进货价、续费、配额和定制费用均需询价。', ['代理启动、订阅、定制、超量和续费分别如何收费？', '是否设最低采购量，以及退费或退出条件？']],
    ['已有旧终端服务报价，但不是渠道报价。', '旧报价已过期，人工投入和代理价格需重新确认。', ['请提供当前有效的渠道报价，并区分软件与人工费用。', '最低承诺期限、启动投入和退出费用分别是什么？']]
  ] }
];

export default function DecisionFocus({ vendors, DocumentLink, ask, notify }) {
  const [selected, setSelected] = useState('delivery');
  const [copied, setCopied] = useState('');
  const priority = priorities.find(p => p.id === selected);
  return <section className="focus-review" aria-labelledby="focus-heading">
    <div className="section-title"><h2 id="focus-heading">02 / 按合作重点看三家</h2><span className="small-label">尚未实测，不作排名</span></div>
    <div className="focus-tabs" role="tablist" aria-label="合作重点">
      {priorities.map(p => <button key={p.id} id={`focus-${p.id}`} role="tab" aria-selected={selected === p.id} aria-controls="focus-results" onClick={() => { setSelected(p.id); setCopied(''); }}>{p.label}</button>)}
    </div>
    <div id="focus-results" role="tabpanel" aria-labelledby={`focus-${selected}`}>
      <p className="focus-note" aria-live="polite">{priority.note}</p>
      <div className="focus-columns" aria-hidden="true"><span>候选方</span><span>已有信息</span><span>决定前的缺口</span></div>
      {vendors.map((v, i) => {
        const [known, gap, questions] = priority.rows[i];
        return <article className="focus-vendor" key={`${selected}-${v.id}`}>
          <div className="focus-facts"><h3><span className={`dot ${v.color}`} />{v.name}</h3><p><span className="focus-mobile-label">已有信息</span>{known}</p><p className="focus-gap"><span className="focus-mobile-label">待核实</span>{gap}</p></div>
          <details className="meeting-questions">
            <summary>跟{v.name}谈什么<ChevronDown size={14} /></summary>
            <ol>{questions.map(q => <li key={q}>{q}</li>)}</ol>
            <div className="meeting-actions">
              <button className="text-button" onClick={async () => {
                try { await navigator.clipboard.writeText(`${v.name} / ${priority.label}\n${questions.map((q, n) => `${n + 1}. ${q}`).join('\n')}`); setCopied(v.id); }
                catch { notify('复制未获授权，请选中问题文字复制。'); }
              }}>{copied === v.id ? <Check size={14} /> : <Copy size={14} />}{copied === v.id ? '已复制' : '复制问题'}</button>
              <DocumentLink className="text-button" href={`/api/documents/${v.id}/file`}><FileText size={14} />供应商原始材料</DocumentLink>
              <button className="text-button" onClick={() => ask(`关于${v.name}的GEO代理合作，我关注${priority.label}。${questions.join('')} 请区分已有依据和待核实事项。`, v.id)}>继续追问<ArrowRight size={14} /></button>
            </div>
          </details>
        </article>;
      })}
    </div>
  </section>;
}
