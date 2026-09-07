"""Build a local, page-addressable evidence index from the supplied PDFs."""
from pathlib import Path
import json
import shutil
import subprocess
import os
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / 'Desktop'
REPORTS = DESKTOP / 'GEO_Yangzhou_Report/output/pdf'
SPECS = [
    ('brief', REPORTS / 'GEO_Technical_Partner_Brief_2026-09-07.pdf', '技术匹配与区域代理建议', '决策报告', 'analysis', '2026-09-07', '最新技术简报 · 扬州 / 泰州'),
    ('report', REPORTS / 'Yangzhou_GEO_Market_Report_2026-09-06.pdf', '扬州市场拓展与供应商评估', '决策报告', 'analysis', '2026-09-06', '历史研究 · 仅扬州，预算为假设'),
    ('mf', DESKTOP / '迈富时Marketingforce公司介绍 202608.pdf', '迈富时 Marketingforce 公司介绍', '供应商材料', 'claim', '2026-08', '企业AI平台与GEO产品资料'),
    ('vigilath', DESKTOP / 'Vigilath-GEO.pdf', 'Vigilath GEO 产品与服务', '供应商材料', 'claim', '日期未注明', 'GEO监测、白标与定制方案'),
    ('aistar', DESKTOP / 'AI品牌数字资产新基建GEO营销运营及技术服务报价及方案-AIstarGEO智星销（上海同源元数字科技有限公司）2026年5月.pdf', 'AIstarGEO 智星销方案与报价', '供应商材料', 'claim', '2026-05-22', '旧终端报价已过有效期 · 非代理价'),
    ('local', DESKTOP / '扬州数智无人科技全空间AI生态体系介绍(1).pdf', '数智无人科技 · 全空间AI生态', '业务背景', 'claim', '日期未注明', '业务场景参考 · 规划与落地需区分'),
    ('industrial', DESKTOP / '赋能工业未来——基于本体论的AI解决方案2026.8.pdf', '基于本体论的工业AI解决方案', '业务背景', 'claim', '2026-08', '工业AI方向 · 性能数字待核实'),
]

for folder in ['private/documents', 'public/previews', 'data', 'tmp/ocr']:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)
documents, chunks, pending = [], [], []
for doc_id, source, title, category, evidence, date, description in SPECS:
    dest = ROOT / f'private/documents/{doc_id}.pdf'
    if source.exists():
        shutil.copy2(source, dest)
    if not dest.exists():
        raise FileNotFoundError(f'Missing source for {doc_id}')
    reader = PdfReader(dest)
    pdf = pdfium.PdfDocument(str(dest))
    preview = pdf[0].render(scale=.7).to_pil().convert('RGB')
    preview.save(ROOT / f'public/previews/{doc_id}.webp', quality=85)
    documents.append(dict(id=doc_id, title=title, category=category, type=evidence, date=date,
                          description=description, pages=len(reader.pages), filename=f'{doc_id}.pdf',
                          size=dest.stat().st_size, preview=f'/previews/{doc_id}.webp'))
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or '').strip()
        record = dict(id=f'{doc_id}-p{i+1}', documentId=doc_id, page=i+1, title=f'{title} · 第{i+1}页',
                      text=text, type=evidence, date=date, extraction='text')
        if len(text) < 80:
            png = ROOT / f'tmp/ocr/{doc_id}-{i+1}.png'
            pdf[i].render(scale=1.7).to_pil().save(png)
            pending.append((png, record))
        chunks.append(record)
    print(f'Indexed {doc_id}: {len(reader.pages)} pages', flush=True)
if pending:
    print(f'OCR {len(pending)} scanned pages with Apple Vision', flush=True)
    result = subprocess.run(['swift', str(ROOT/'scripts/ocr.swift'), *[str(p) for p, _ in pending]],
                            capture_output=True, text=True, check=True)
    recognized = {entry['file']: entry['text'] for entry in map(json.loads, result.stdout.splitlines())}
    for path, record in pending:
        record['text'] = recognized.get(str(path), '')
        record['extraction'] = 'ocr'
        if not record['text'].strip():
            record['extraction'] = 'unreadable'
    print('OCR complete', flush=True)

shutil.copy2(ROOT/'knowledge/project-notes.md', ROOT/'private/documents/notes.md')
documents.append(dict(id='notes', title='项目确认与新增招商笔记', category='项目记录', type='mixed',
                      date='2026-09-07', description='业务范围、朋友关系及迈富时招商口径', pages=0,
                      filename='notes.md', size=(ROOT/'private/documents/notes.md').stat().st_size))
for item in json.loads((ROOT/'knowledge/curated.json').read_text()):
    chunks.append({**item, 'curated': True, 'date':'2026-09-07'})
registry = DESKTOP/'GEO_Yangzhou_Report/sources.json'
corrections = ROOT/'knowledge/page-corrections.json'
if corrections.exists():
    for correction in json.loads(corrections.read_text()):
        for chunk in chunks:
            if chunk['id'] == correction['id']:
                chunk.update(correction)
if registry.exists():
    shutil.copy2(registry, ROOT/'data/reference-registry.json')
(ROOT/'data/library.json').write_text(json.dumps({'documents':documents, 'chunks':chunks}, ensure_ascii=False))
os.chmod(ROOT/'.env', 0o600)
print(f'Complete: {len(documents)} documents, {len(chunks)} indexed records')
