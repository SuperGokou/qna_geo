export async function requestJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    return { response, data };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut) throw new Error('连接服务超时。当前网络可能无法访问服务地址，请稍后重试或联系管理员。');
    throw new Error('无法连接问答服务，请检查网络或联系管理员。');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
