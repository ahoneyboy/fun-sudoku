<script setup>
/**
 * 设置页：游戏开关（自定义 Toggle）+ 数据管理（导出/导入/清空/恢复出厂）+ 关于
 * 所有破坏性操作都走 ConfirmDialog 二次确认
 */
import { ref, computed, onMounted } from 'vue';
import {
  Volume2,
  ShieldCheck,
  Database,
  Download,
  Upload,
  Trash2,
  BookX,
  RotateCcw,
  Info,
} from 'lucide-vue-next';
import { useSettingsStore } from '../stores/settings';
import { useRecordsStore } from '../stores/records';
import { useWrongbookStore } from '../stores/wrongbook';
import { useUiStore } from '../stores/ui';
import BaseToggle from '../components/BaseToggle.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const APP_VERSION = '1.0.0';

const settings = useSettingsStore();
const records = useRecordsStore();
const wrongbook = useWrongbookStore();
const ui = useUiStore();

const fileInput = ref(null);
const importData = ref(null); // 校验通过、待二次确认的备份数据
const dialog = ref(null); // { title, desc, confirmText, danger, action }

const dialogOpen = computed({
  get: () => !!dialog.value,
  set: (v) => {
    if (!v) dialog.value = null;
  },
});

function ask(cfg) {
  dialog.value = cfg;
}

// ---- 导出：settings/records/wrongbook 打包为 JSON 下载 ----
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      sound: settings.sound,
      realtime: settings.realtime,
      nickname: settings.nickname,
      createdAt: settings.createdAt,
      guideShown: settings.guideShown,
    },
    records: records.list,
    wrongbook: wrongbook.list,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  a.download = `fun-sudoku-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ui.toast('备份文件已开始下载', 'success');
}

// ---- 导入：读文件 → 校验 → 二次确认 → 全量覆盖 ----
function pickFile() {
  fileInput.value && fileInput.value.click();
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // 允许连续选择同一个文件
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const err = validateImport(data);
      if (err) {
        ui.toast(err, 'warn', 3200);
        return;
      }
      importData.value = data;
      ask({
        title: '导入这份备份？',
        desc: '导入会全量覆盖当前的设置、做题记录和错题本，且无法恢复。',
        confirmText: '覆盖导入',
        danger: true,
        action: doImport,
      });
    } catch (err) {
      ui.toast('文件解析失败，请选择正确的备份 JSON 文件', 'warn', 3200);
    }
  };
  reader.onerror = () => ui.toast('文件读取失败，请重试', 'warn');
  reader.readAsText(file);
}

function validateImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return '文件内容不是有效的备份对象';
  }
  if (data.version !== 1) return '备份版本不匹配，无法导入';
  if (!data.settings || typeof data.settings !== 'object') {
    return '备份缺少 settings 字段';
  }
  if (!Array.isArray(data.records) || !Array.isArray(data.wrongbook)) {
    return '备份缺少 records / wrongbook 字段';
  }
  return '';
}

async function doImport() {
  const data = importData.value;
  if (!data) return;
  await settings.applyImport(data.settings);
  await records.replaceAll(data.records);
  await wrongbook.replaceAll(data.wrongbook);
  importData.value = null;
  ui.toast('导入成功，数据已完整恢复！', 'success');
}

// ---- 清空 / 恢复出厂 ----
async function clearRecords() {
  await records.clearAll();
  ui.toast('做题记录已清空', 'success');
}
async function clearWrongbook() {
  await wrongbook.clearAll();
  ui.toast('错题本已清空', 'success');
}
async function factoryReset() {
  await settings.factoryReset(); // 清空全部仓库并重写默认设置
  ui.toast('已恢复出厂设置', 'success');
}

onMounted(() => {
  settings.hydrate();
  records.hydrate();
  wrongbook.hydrate();
});
</script>

<template>
  <div class="w-full max-w-2xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10 space-y-4 md:space-y-6">
    <div>
      <h1 class="text-2xl md:text-3xl font-black">设置</h1>
      <p class="text-sm font-bold text-ink-soft mt-1">按你喜欢的方式来玩</p>
    </div>

    <!-- 游戏开关 -->
    <section class="card p-5 md:p-6">
      <div class="flex items-center gap-2 font-black text-lg mb-3">
        <span class="w-9 h-9 rounded-2xl bg-mint-soft text-mint-deep flex items-center justify-center">
          <Volume2 class="w-5 h-5" />
        </span>
        游戏开关
      </div>
      <div class="divide-y divide-[#F5EDE0]">
        <BaseToggle
          :model-value="settings.sound"
          label="轻柔音效"
          desc="点选、答对、通关时的轻柔提示音"
          tone="mint"
          @update:model-value="settings.setSound($event)"
        />
        <BaseToggle
          :model-value="settings.realtime"
          label="实时错误提示"
          desc="开启后填错会立刻标红；关闭则靠「检查」或填满时校验"
          tone="butter"
          @update:model-value="settings.setRealtime($event)"
        />
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="card p-5 md:p-6">
      <div class="flex items-center gap-2 font-black text-lg mb-1">
        <span class="w-9 h-9 rounded-2xl bg-azure-soft text-azure-deep flex items-center justify-center">
          <Database class="w-5 h-5" />
        </span>
        数据管理
      </div>
      <p class="text-xs md:text-sm font-bold text-ink-soft mb-4">
        数据保存在本机浏览器中，可用备份文件迁移到其他设备。
      </p>

      <div class="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          class="btn-candy px-4 py-3 bg-mint-soft text-mint-deep"
          @click="exportData"
        >
          <Download class="w-4 h-4" />
          导出数据
        </button>
        <button
          type="button"
          class="btn-candy px-4 py-3 bg-azure-soft text-azure-deep"
          @click="pickFile"
        >
          <Upload class="w-4 h-4" />
          导入数据
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          aria-label="选择备份文件"
          @change="onFileChange"
        />
        <button
          type="button"
          class="btn-candy px-4 py-3 bg-cream text-ink"
          @click="
            ask({
              title: '清除全部做题记录？',
              desc: `将删除 ${records.totalCount} 条通关记录与统计，错题本不受影响。`,
              confirmText: '清除记录',
              danger: true,
              action: clearRecords,
            })
          "
        >
          <Trash2 class="w-4 h-4" />
          清除做题记录
        </button>
        <button
          type="button"
          class="btn-candy px-4 py-3 bg-cream text-ink"
          @click="
            ask({
              title: '清空错题本？',
              desc: `将移除收录的 ${wrongbook.list.length} 道错题，无法恢复。`,
              confirmText: '清空',
              danger: true,
              action: clearWrongbook,
            })
          "
        >
          <BookX class="w-4 h-4" />
          清空错题本
        </button>
      </div>

      <div class="mt-3">
        <button
          type="button"
          class="btn-candy w-full px-4 py-3 bg-[#FFE4EA] text-[#E05C75]"
          @click="
            ask({
              title: '恢复出厂设置？',
              desc: '将清空设置、做题记录、错题本与题库缓存，并重置为默认配置。',
              confirmText: '全部重置',
              danger: true,
              action: factoryReset,
            })
          "
        >
          <RotateCcw class="w-4 h-4" />
          恢复出厂
        </button>
      </div>
    </section>

    <!-- 关于 -->
    <section class="card p-5 md:p-6">
      <div class="flex items-center gap-2 font-black text-lg mb-3">
        <span class="w-9 h-9 rounded-2xl bg-lilac-soft text-lilac-deep flex items-center justify-center">
          <Info class="w-5 h-5" />
        </span>
        关于
      </div>
      <div class="space-y-2 text-sm font-bold text-ink-soft leading-relaxed">
        <p>趣味数独 <span class="text-ink">v{{ APP_VERSION }}</span></p>
        <p>
          一款面向 6-12 岁小朋友的卡通数独单机应用：四宫 / 六宫 / 九宫循序渐进，
          题目全部唯一解，提示会讲"为什么"，没有失败只有小失误。
        </p>
        <p>纯前端实现，无账号无后端，数据仅保存在你自己的设备里。</p>
      </div>
    </section>

    <!-- 统一二次确认弹窗 -->
    <ConfirmDialog
      v-model:open="dialogOpen"
      :title="dialog ? dialog.title : ''"
      :desc="dialog ? dialog.desc : ''"
      :confirm-text="dialog ? dialog.confirmText : '确定'"
      :danger="dialog ? dialog.danger : false"
      @confirm="
        () => {
          const d = dialog;
          dialog = null;
          if (d) d.action();
        }
      "
    />
  </div>
</template>
