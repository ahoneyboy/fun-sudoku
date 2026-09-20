/**
 * 全局 UI 状态：Toast 队列
 *
 * 【为什么进 Pinia】游戏 store、设置页、错误兜底都可能弹提示，
 * Toast 是典型的跨组件状态，按约定统一走 Pinia 而不是事件总线。
 */
import { defineStore } from 'pinia';

let seq = 0;

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [], // { id, text, type } type: 'info' | 'success' | 'warn'
  }),
  actions: {
    /**
     * 弹一条提示
     * @param {string} text 文案（全站鼓励式语气）
     * @param {'info'|'success'|'warn'} type
     * @param {number} duration 展示毫秒数（提示讲解等长文案可传更长）
     */
    toast(text, type = 'info', duration = 2400) {
      const id = ++seq;
      this.toasts.push({ id, text, type });
      // 队列超长时丢最旧的，避免连续操作堆满屏幕
      if (this.toasts.length > 4) this.toasts.shift();
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
      }, duration);
    },
  },
});
