<script setup>
/**
 * 错题本：卡片列表（难度徽章 + 收录时间 + 迷你盘面 + 再挑战）
 * 一键清空带二次确认；上限 50 条由 wrongbook store 保证，超出淘汰最旧
 */
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BookX, Trash2, Play, X } from 'lucide-vue-next';
import { DIFFS, decode } from '../core/sudoku';
import { fmtDate } from '../core/format';
import { useWrongbookStore } from '../stores/wrongbook';
import { useUiStore } from '../stores/ui';
import MiniBoard from '../components/MiniBoard.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import EmptyState from '../components/EmptyState.vue';

const router = useRouter();
const wrongbook = useWrongbookStore();
const ui = useUiStore();

const clearOpen = ref(false);

// 过滤掉难度非法的脏数据，避免模板取 DIFFS[diffKey] 时报错
const items = computed(() =>
  wrongbook.list
    .filter((i) => DIFFS[i.diffKey])
    .map((i) => ({
      ...i,
      values: decode(i.puzzle),
      size: DIFFS[i.diffKey].size,
      label: DIFFS[i.diffKey].label,
    })),
);

// Tailwind JIT 需要字面量类名
const TONE = {
  mint: 'bg-mint-soft text-mint-deep',
  butter: 'bg-butter-soft text-butter-deep',
  azure: 'bg-azure-soft text-azure-deep',
  lilac: 'bg-lilac-soft text-lilac-deep',
};

function rechallenge(item) {
  router.push({ path: '/game', query: { diff: item.diffKey, sig: item.sig } });
}
function removeOne(item) {
  wrongbook.remove(item.sig);
  ui.toast('已从错题本移除', 'success');
}
async function clearAll() {
  await wrongbook.clearAll();
  ui.toast('错题本已清空，轻装上阵！', 'success');
}

onMounted(() => wrongbook.hydrate());
</script>

<template>
  <div class="w-full max-w-5xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10">
    <div class="flex items-center justify-between mb-4 gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-black">错题本</h1>
        <p class="text-sm font-bold text-ink-soft mt-1">
          {{ items.length ? `收录 ${items.length} 题，打败一题就少一题！` : '这里是空的' }}
        </p>
      </div>
      <button
        v-if="items.length"
        type="button"
        class="btn-candy px-4 py-2.5 bg-[#FFE4EA] text-[#E05C75] text-sm"
        @click="clearOpen = true"
      >
        <Trash2 class="w-4 h-4" />
        一键清空
      </button>
    </div>

    <!-- 加载骨架 -->
    <div v-if="!wrongbook.hydrated" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="card h-44 animate-pulse bg-[#F7F2FB]" />
    </div>

    <EmptyState
      v-else-if="!items.length"
      :icon="BookX"
      title="错题本是空的，太棒啦！"
      desc="做错的小失误会被温柔地收在这里，随时可以回来再挑战一次。"
    >
      <button
        type="button"
        class="btn-candy mt-2 px-6 py-3 bg-mint-deep text-white"
        @click="router.push('/')"
      >
        <Play class="w-4 h-4" />
        去做一题
      </button>
    </EmptyState>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <div
        v-for="item in items"
        :key="item.sig"
        class="card p-4 flex gap-4 items-center"
      >
        <div class="w-24 shrink-0">
          <MiniBoard :size="item.size" :values="item.values" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="pill" :class="TONE[DIFFS[item.diffKey].tone]">
              {{ item.label }}
            </span>
            <!-- 单条移除 -->
            <button
              type="button"
              class="ml-auto w-7 h-7 rounded-full bg-cream text-ink-soft flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="移出该题"
              @click="removeOne(item)"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="text-xs font-bold text-ink-soft mt-1.5">
            收录于 {{ fmtDate(item.addedAt) }}
          </div>
          <button
            type="button"
            class="btn-candy mt-3 px-4 py-2 bg-mint-deep text-white text-sm"
            @click="rechallenge(item)"
          >
            <Play class="w-3.5 h-3.5" />
            再挑战
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="clearOpen"
      title="清空整个错题本？"
      desc="所有收录的错题都会被移除，无法恢复。"
      confirm-text="清空"
      danger
      @confirm="clearAll"
    />
  </div>
</template>
