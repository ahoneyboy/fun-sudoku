/**
 * 设置 store：游戏开关 + 首次引导标记
 * 持久化在 localforage settings 分区，key 固定 'local'
 */
import { defineStore } from 'pinia';
import { db } from './db';
import { sfx } from '../core/audio';
import { useRecordsStore } from './records';
import { useWrongbookStore } from './wrongbook';
import { useGameStore } from './game';

const SETTINGS_KEY = 'local';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    sound: true, // 轻柔音效（默认开）
    realtime: true, // 实时错误提示（默认开）
    nickname: '',
    createdAt: 0,
    guideShown: false, // 首次游玩引导是否已展示过（之后不再打扰）
    hydrated: false,
  }),
  actions: {
    /** 启动时从本地恢复到内存（幂等，只执行一次） */
    async hydrate() {
      if (this.hydrated) return;
      try {
        await db.ready;
        const s = await db.settings.getItem(SETTINGS_KEY);
        if (s && typeof s === 'object') {
          this.$patch({
            sound: s.sound !== false,
            realtime: s.realtime !== false,
            nickname: typeof s.nickname === 'string' ? s.nickname : '',
            createdAt: Number(s.createdAt) || Date.now(),
            guideShown: !!s.guideShown,
          });
        } else {
          // 首次使用：写入一份默认设置
          this.createdAt = Date.now();
          await this.persist();
        }
      } catch (e) {
        // 存储不可用：保持默认值继续运行（db 层已降级内存模式）
      }
      this.hydrated = true;
    },
    /** 先更内存后落盘：落盘失败不影响本次会话 */
    async persist() {
      try {
        await db.settings.setItem(SETTINGS_KEY, {
          sound: this.sound,
          realtime: this.realtime,
          nickname: this.nickname,
          createdAt: this.createdAt,
          guideShown: this.guideShown,
        });
      } catch (e) {
        /* 内存模式下静默 */
      }
    },
    setSound(v) {
      this.sound = !!v;
      if (this.sound) sfx.ok(); // 打开时给一声反馈，让小朋友确认开关生效
      return this.persist();
    },
    setRealtime(v) {
      this.realtime = !!v;
      return this.persist();
    },
    setGuideShown() {
      this.guideShown = true;
      return this.persist();
    },
    /** 用导入数据覆盖设置（导入功能用） */
    async applyImport(obj) {
      const s = obj && typeof obj === 'object' ? obj : {};
      this.$patch({
        sound: s.sound !== false,
        realtime: s.realtime !== false,
        nickname: typeof s.nickname === 'string' ? s.nickname : '',
        createdAt: Number(s.createdAt) || Date.now(),
        guideShown: !!s.guideShown,
      });
      return this.persist();
    },
    /**
     * 恢复出厂：清空全部仓库（设置/记录/错题/题库缓存池）并重写默认设置。
     * 放在 store 里集中处理，组件不直接操作 localforage
     */
    async factoryReset() {
      const records = useRecordsStore();
      const wrongbook = useWrongbookStore();
      const game = useGameStore();
      await Promise.all([
        db.settings.clear(),
        db.records.clear(),
        db.wrong.clear(),
        db.meta.clear(), // 连题库缓存池等设备本地数据一起清
      ].map((p) => p.catch(() => {})));
      this.$patch({
        sound: true,
        realtime: true,
        nickname: '',
        guideShown: false,
        createdAt: Date.now(),
      });
      await this.persist();
      records.list = [];
      wrongbook.list = [];
      game.abandon();
    },
  },
});
