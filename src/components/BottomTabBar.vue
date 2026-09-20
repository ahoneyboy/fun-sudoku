<script setup>
/**
 * 底部 TabBar（手机端，<md 显示）：5 个入口 + 刘海屏安全区适配
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
  <nav
    class="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur border-t border-[#F0E4D2]"
    aria-label="底部导航"
  >
    <div class="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
      <router-link
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-bold cursor-pointer select-none"
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
  </nav>
</template>
