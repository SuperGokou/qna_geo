const unrelated = /炒菜|做饭|菜谱|食谱|天气|彩票|赌博|色情|写情书|笑话|星座|股票买卖|推荐股票|预测股价|写诗|故事|旅游行程|游戏攻略|减肥食谱|诊断病|感冒吃|双色球|translate.*poem/i;
const injection = /忽略.{0,12}(规则|指令|限制)|泄露.{0,12}(密钥|密码)|输出.{0,12}(api.?key|系统提示词)|ignore.{0,20}(instruction|system)|reveal.{0,20}(key|secret)/i;
const domain = /\bgeo\b|生成式引擎|生成引擎|迈富时|珍岛|vigilath|威吉力|智星销|aistargeo|marketingforce|同源元|区域代理|渠道政策|GEO优化|品牌可见|推荐率|白标|多租户|采样|信源|收录|知识资产|智能体|agent|模型训练|提示词|知识库|人工审核|渠道报价|技术验收|36[,，]?800|29[,，]?400|80%利润|扬州.*泰州/i;
export function isGeoQuestion(question, history = []) {
  if (unrelated.test(question) || injection.test(question)) return false;
  if (['三家技术上哪家更匹配？', '签约前还有哪些关键缺口？', '80%利润具体是什么口径？', '签约前还要核实什么？'].includes(question.trim())) return true;
  if (domain.test(question)) return true;
  const recent = history.filter(m => m.role === 'user').slice(-2).some(m => domain.test(m.content));
  return recent && question.length < 120 && /哪家|哪个|那|它|他们|这家|比较|成本|风险|价格|利润|优势|缺点|条件|合同|继续|具体|为什么|如何|怎么|靠谱吗|多少钱/.test(question);
}
export const scopeRefusal = () => ({
  mode: 'scope', summary: '这个入口仅处理 GEO 技术、供应商评估及扬州/泰州区域代理合作问题，暂不回答其他主题。',
  points: [], citations: [], unknowns: [], followups: ['三家技术上哪家更匹配？', '迈富时80%利润是什么口径？', '区域代理签约前要核实什么？'],
});
