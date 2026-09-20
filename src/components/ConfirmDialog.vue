<script setup>
/**
 * 通用二次确认弹窗（v-model:open）
 * danger=true 时确认按钮为警示红（清空数据/恢复出厂）
 */
const open = defineModel('open', { type: Boolean, default: false });

defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '再想想' },
  danger: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm']);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
        @click.self="open = false"
      >
        <div class="modal-card card w-full max-w-sm p-6 text-center animate-fade-up">
          <h3 class="text-xl font-black mb-2">{{ title }}</h3>
          <p class="text-sm text-ink-soft leading-relaxed mb-6 whitespace-pre-line">
            {{ desc }}
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              class="btn-candy flex-1 py-3 bg-cream text-ink"
              @click="open = false"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              class="btn-candy flex-1 py-3 text-white"
              :class="danger ? 'bg-[#FF5A76]' : 'bg-mint-deep'"
              @click="emit('confirm'); open = false"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
