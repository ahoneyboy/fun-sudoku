/**
 * 音效模块：WebAudio 现场合成，零音频文件
 *
 * 【为什么合成而不是放音频文件】四段提示音都是单音/琶音，
 * 振荡器 + 包络几行代码就能生成，省掉资源体积与加载等待。
 *
 * 包络策略：极快淡入（12ms 线性）+ 指数淡出，避免"咔哒"爆音；音量上限 0.09，
 * 对小朋友的耳朵友好。任何合成失败都静默降级（try/catch），绝不打断游戏。
 * 首次用户手势时调用 unlock() 以满足浏览器自动播放策略（resume AudioContext）。
 */

let ctx = null;

function audioContext() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  // iOS/Safari 常见：上下文创建后处于 suspended，需要手势唤醒
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** 单音合成：freq 频率 / type 波形 / dur 时长 / delay 相对延迟 / vol 音量 */
function tone({ freq, type = 'sine', dur = 0.18, delay = 0, vol = 0.09 }) {
  try {
    const c = audioContext();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    // 快淡入 + 指数淡出包络
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (e) {
    // 合成失败静默降级：音效是锦上添花，不能影响交互
  }
}

export const sfx = {
  /** 在首次用户手势里调用一次，解除自动播放限制 */
  unlock() {
    try {
      audioContext();
    } catch (e) {
      /* 忽略 */
    }
  },
  /** 点选：760Hz 短音 */
  tap() {
    tone({ freq: 760, dur: 0.08, vol: 0.05 });
  },
  /** 填对：523 → 784 双音上行 */
  ok() {
    tone({ freq: 523, dur: 0.12, vol: 0.08 });
    tone({ freq: 784, dur: 0.16, delay: 0.09, vol: 0.08 });
  },
  /** 填错：233Hz 三角波短音（低沉但不刺耳） */
  err() {
    tone({ freq: 233, type: 'triangle', dur: 0.2, vol: 0.07 });
  },
  /** 通关：523-659-784-1047 上行琶音 */
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, delay: i * 0.12, vol: 0.09 }),
    );
  },
};
