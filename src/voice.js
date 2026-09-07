import { useEffect, useRef, useState } from 'react';

export function useVoiceInput({ text, setText, onError }) {
  const [listening, setListening] = useState(false);
  const ref = useRef(null);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  useEffect(() => () => ref.current?.abort(), []);
  function toggle() {
    if (listening) { ref.current?.stop(); return; }
    if (!Recognition) { onError('当前浏览器不支持语音识别，请使用支持此功能的 Chrome / Edge，或直接输入文字。'); return; }
    const recognition = new Recognition();
    ref.current = recognition;
    recognition.lang = 'zh-CN'; recognition.interimResults = true; recognition.continuous = false;
    const base = text.trim();
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = event => {
      setListening(false);
      const errors = { 'not-allowed': '麦克风权限未开放，请检查浏览器权限。', 'network': '浏览器语音识别服务连接失败，请使用文字输入。', 'no-speech': '没有识别到语音，请再试一次。', 'audio-capture': '未找到可用麦克风。' };
      onError(errors[event.error] || '语音识别暂时不可用，请重新尝试。');
    };
    recognition.onresult = event => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setText(`${base}${base ? ' ' : ''}${transcript}`.slice(0, 2000));
    };
    try { recognition.start(); } catch { onError('无法启动语音识别，请重试。'); }
  }
  return { listening, supported: !!Recognition, toggle, stop: () => ref.current?.stop() };
}
export function useReadAloud(onError) {
  const [reading, setReading] = useState(null);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  function read(id, text) {
    if (!window.speechSynthesis) { onError('当前浏览器不支持回答朗读。'); return; }
    window.speechSynthesis.cancel();
    if (reading === id) { setReading(null); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; utterance.rate = 1;
    utterance.voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('zh')) || null;
    utterance.onend = () => setReading(null);
    utterance.onerror = e => { setReading(null); if (!['canceled', 'interrupted'].includes(e.error)) onError('朗读暂时不可用。'); };
    setReading(id); window.speechSynthesis.speak(utterance);
  }
  return { reading, read, stop: () => { window.speechSynthesis?.cancel(); setReading(null); } };
}
