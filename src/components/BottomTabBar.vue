<script setup>
/**
 * 底部导航（手机端，<md 显示）：悬浮胶囊样式
 * - 悬浮于底部，与屏幕边缘留出间距，圆角 + 毛玻璃 + 大投影
 * - bottom 偏移含 iOS 安全区（env(safe-area-inset-bottom)），刘海/小白条不遮挡
 * - pointer-events 分层：外层容器不拦截点击，胶囊本体可点
 */
import { useRoute } from 'vue-router';
import {
  House,
  BarChart3,
  GraduationCap,
  BookX,
  Settings,
} from 'lucide-vue-next';

const route = useRoute();

const tabs = [
  { to: '/', label: '首页', icon: House },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/learn', label: '学堂', icon: GraduationCap },
  { to: '/errorbook', label: '错题本', icon: BookX },
  { to: '/settings', label: '设置', icon: Settings },
];

function isActive(to) {
  return route.path === to;
}
</script>

<template>
  <!-- 外层：只负责定位，不拦截手势 -->
  <div class="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none">
    <nav
      class="pointer-events-auto rounded-t-[26px] bg-white/90 backdrop-blur-md border-t border-x border-white/70 shadow-[0_-8px_30px_rgba(91,74,84,0.18)]"
      aria-label="底部导航"
    >
      <div class="grid grid-cols-5 px-1.5">
        <router-link
          v-for="t in tabs"
          :key="t.to"
          :to="t.to"
          class="flex flex-col items-center gap-0.5 pt-2 text-[10px] font-bold cursor-pointer select-none transition-transform duration-150 active:scale-95"
          :class="isActive(t.to) ? 'text-mint-deep' : 'text-ink-soft'"
        >
          <span
            class="w-10 h-7 flex items-center justify-center rounded-full transition-colors"
            :class="isActive(t.to) ? 'bg-mint-soft' : ''"
          >
            <component :is="t.icon" class="w-5 h-5" />
          </span>
          {{ t.label }}
        </router-link>
      </div>
      <!-- 安全区：小白条/.home indicator 区域并入导航条本体 -->
      <div class="h-[env(safe-area-inset-bottom)]" />
    </nav>
  </div>
</template>
