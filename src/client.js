export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
let token = '';
export function clearToken() { token = ''; }
export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE}${url}`, { ...options, headers });
}
export async function api(url, options) {
  if (location.hostname.endsWith('github.io') && !API_BASE) throw new Error('后端尚未配置，请设置仓库变量 VITE_API_BASE_URL 后重新部署。');
  const response = await apiFetch(url, options);
  let data;
  try { data = await response.json(); } catch { throw new Error('无法连接问答服务，请检查后端地址与网络。'); }
  if (!response.ok) throw new Error(data.error || '请求失败，请重试。');
  if (url === '/api/login' && data.token) token = data.token;
  if (url === '/api/logout') token = '';
  return data;
}
export async function openDocument(href) {
  const popup = window.open('', '_blank');
  if (popup) { popup.opener = null; popup.document.title = '正在载入资料'; popup.document.body.textContent = '正在安全载入原始资料…'; }
  try {
    const [url, hash] = href.split('#');
    const response = await apiFetch(url);
    if (!response.ok) throw new Error('资料访问失败，请重新登录或检查网络。');
    const objectUrl = URL.createObjectURL(await response.blob());
    if (popup) popup.location.href = objectUrl + (hash ? `#${hash}` : '');
    else { const a = document.createElement('a'); a.href = objectUrl; a.download = url.includes('/notes/') ? '项目记录.txt' : 'GEO资料.pdf'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 300000);
  } catch (error) { if (popup) popup.document.body.textContent = error.message; else alert(error.message); }
}
