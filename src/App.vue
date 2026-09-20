<script setup>
/**
 * 应用根组件：三端骨架布局
 * - md 及以上：左侧边栏（可折叠）+ 内容区
 * - 手机：内容区 + 底部 TabBar（页面自身留 pb-28 避让）
 * - 全局 Toast 挂载于此；启动时完成各 store 的 hydrate 与音频解锁
 */
import { onMounted, onBeforeUnmount } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import BottomTabBar from './components/BottomTabBar.vue';
import AppToast from './components/AppToast.vue';
import { useSettingsStore } from './stores/settings';
import { useRecordsStore } from './stores/records';
import { useWrongbookStore } from './stores/wrongbook';
import { useGameStore } from './stores/game';
import { useUiStore } from './stores/ui';
import { storageMode } from './stores/db';
import { sfx } from './core/audio';

const settings = useSettingsStore();
const records = useRecordsStore();
const wrongbook = useWrongbookStore();
const game = useGameStore();
const ui = useUiStore();

// 首次用户手势时唤醒 AudioContext（浏览器自动播放策略要求）
function unlockAudio() {
  sfx.unlock();
}

// 切后台自动暂停计时，回前台恢复（成绩不受影响）
function onVisibility() {
  if (document.hidden) {
    game.pauseTimer();
  } else {
    game.resumeTimer();
  }
}

onMounted(async () => {
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  // 启动 hydrate：本地数据先到内存，组件按 hydrated 标记显示骨架
  await Promise.all([settings.hydrate(), records.hydrate(), wrongbook.hydrate()]);
  // 存储被浏览器禁用（如隐私模式）：已降级内存模式，提示一次
  if (storageMode.value === 'memory') {
    ui.toast('浏览器存储不可用，本次数据只保存在内存中', 'warn', 6000);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <div class="min-h-dvh flex">
    <AppSidebar />
    <div class="flex-1 min-w-0 flex flex-col">
      <main class="flex-1">
        <router-view />
      </main>
    </div>
    <BottomTabBar />
    <AppToast />
  </div>
</template>
