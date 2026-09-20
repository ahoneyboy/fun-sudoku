<script setup>
/**
 * 侧边栏导航（md 及以上显示）：图标 + 文字，可折叠（折叠后只留图标）
 * 与底部 TabBar 共用同一份导航配置，保证两端入口一致
 */
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  House,
  BarChart3,
  GraduationCap,
  BookX,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next';

const route = useRoute();
const collapsed = ref(false);

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
  <aside
    class="hidden md:flex flex-col shrink-0 sticky top-0 h-dvh bg-white border-r border-[#F0E4D2] transition-all duration-200 z-30"
    :class="collapsed ? 'w-20' : 'w-60'"
  >
    <!-- Logo：马卡龙四宫格 -->
    <div
      class="flex items-center gap-3 px-6 h-20 shrink-0"
      :class="{ 'justify-center px-0': collapsed }"
    >
      <div class="grid grid-cols-2 gap-1 rotate-3">
        <span class="w-3.5 h-3.5 rounded-md bg-mint-deep" />
        <span class="w-3.5 h-3.5 rounded-md bg-butter-deep" />
        <span class="w-3.5 h-3.5 rounded-md bg-azure-deep" />
        <span class="w-3.5 h-3.5 rounded-md bg-blossom-deep" />
      </div>
      <span v-if="!collapsed" class="font-black text-lg whitespace-nowrap">
        趣味数独
      </span>
    </div>

    <nav class="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto">
      <router-link
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors cursor-pointer"
        :class="
          isActive(t.to)
            ? 'bg-mint-soft text-mint-deep'
            : 'text-ink-soft hover:bg-cream'
        "
      >
        <span
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          :class="isActive(t.to) ? 'bg-white/80' : ''"
        >
          <component :is="t.icon" class="w-5 h-5" />
        </span>
        <span v-if="!collapsed">{{ t.label }}</span>
      </router-link>
    </nav>

    <div class="p-3 shrink-0">
      <button
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-ink-soft hover:bg-cream transition-colors cursor-pointer"
        :class="{ 'justify-center px-0': collapsed }"
        :aria-label="collapsed ? '展开侧边栏' : '折叠侧边栏'"
        @click="collapsed = !collapsed"
      >
        <component :is="collapsed ? ChevronsRight : ChevronsLeft" class="w-5 h-5" />
        <span v-if="!collapsed" class="text-sm">收起菜单</span>
      </button>
    </div>
  </aside>
</template>
