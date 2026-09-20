/**
 * 通用格式化与工具函数（纯函数，无副作用，便于单测）
 */

/** 秒 → "mm:ss" / "h:mm:ss"（计时器展示用） */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** 时间戳 → "YYYY-MM-DD HH:mm"（错题收录时间等展示用） */
export function fmtDate(ts) {
  const d = new Date(Number(ts) || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 时间戳 → 本地日期键 "YYYY-MM-DD"（按天聚合统计用） */
export function todayKey(ts) {
  const d = new Date(Number(ts) || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "YYYY-MM-DD" → "MM-DD"（图表横轴标签，避免太拥挤） */
export function fmtDay(key) {
  return String(key || '').slice(5);
}

/** 防抖：函数在 stop 时间内不再被触发时才真正执行 */
export function debounce(fn, wait = 200) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** uuid：优先用浏览器原生实现，环境不支持时用时间+随机兜底 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
