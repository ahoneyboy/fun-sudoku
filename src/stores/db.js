/**
 * localforage 统一存储层（库名 fun-sudoku）
 *
 * 【为什么单独封装】
 * 1. 组件永远不直接操作 localforage，只跟 Pinia store 打交道（spec 约定）；
 * 2. 集中处理"浏览器禁用 IndexedDB"的降级：localforage 找不到 IndexedDB 时
 *    会静默退到 localStorage，而本项目约定不落 localStorage —— 探针检测到后
 *    整体切换为内存模式（storageMode = 'memory'），由 App 层提示用户；
 * 3. 所有读写都套 try/catch，任何一次落盘失败都会切换内存模式并继续工作，
 *    游戏绝不因存储问题崩溃。
 *
 * 题库缓存池等设备本地数据放在 meta 分区（pool_<diffKey>）。
 */
import localforage from 'localforage';
import { ref } from 'vue';

/** 当前存储模式：'idb' 正常；'memory' 内存降级（本次会话数据不持久化） */
export const storageMode = ref('idb');

const memory = new Map(); // 内存模式兜底：key 加分区前缀避免互相覆盖

function makeInstance(storeName) {
  return localforage.createInstance({
    name: 'fun-sudoku',
    storeName,
  });
}

const settingsInst = makeInstance('settings');
const recordsInst = makeInstance('records');
const wrongInst = makeInstance('wrongbook');
const metaInst = makeInstance('meta');

const INSTANCES = {
  settings: settingsInst,
  records: recordsInst,
  wrong: wrongInst,
  meta: metaInst,
};

/** 启动探针：确认 IndexedDB 真正可用（可写） */
async function probe() {
  try {
    await settingsInst.ready();
    // localforage 无 IndexedDB 时会静默改用 localStorage 驱动，这里显式拒绝
    if (settingsInst.driver() !== localforage.INDEXEDDB) {
      throw new Error('IndexedDB 不可用');
    }
    // Safari 隐私模式要真写一次才暴露问题
    await settingsInst.setItem('__probe__', 1);
    await settingsInst.removeItem('__probe__');
  } catch (e) {
    storageMode.value = 'memory';
  }
}

const readyPromise = probe();

function memKey(storeName, key) {
  return `${storeName}/${key}`;
}

/** 给一个分区实例套上"内存降级 + 异常兜底"外壳 */
function wrap(storeName, inst) {
  const inMemory = () => storageMode.value === 'memory';
  return {
    async getItem(key) {
      if (inMemory()) return memory.has(memKey(storeName, key)) ? memory.get(memKey(storeName, key)) : null;
      try {
        return await inst.getItem(key);
      } catch (e) {
        storageMode.value = 'memory';
        return memory.has(memKey(storeName, key)) ? memory.get(memKey(storeName, key)) : null;
      }
    },
    async setItem(key, value) {
      if (inMemory()) {
        memory.set(memKey(storeName, key), value);
        return;
      }
      try {
        await inst.setItem(key, value);
      } catch (e) {
        storageMode.value = 'memory';
        memory.set(memKey(storeName, key), value);
      }
    },
    async removeItem(key) {
      if (inMemory()) {
        memory.delete(memKey(storeName, key));
        return;
      }
      try {
        await inst.removeItem(key);
      } catch (e) {
        storageMode.value = 'memory';
        memory.delete(memKey(storeName, key));
      }
    },
    async clear() {
      if (inMemory()) {
        // 只清本分区前缀，不影响其他分区
        for (const k of Array.from(memory.keys())) {
          if (k.startsWith(`${storeName}/`)) memory.delete(k);
        }
        return;
      }
      try {
        await inst.clear();
      } catch (e) {
        storageMode.value = 'memory';
        for (const k of Array.from(memory.keys())) {
          if (k.startsWith(`${storeName}/`)) memory.delete(k);
        }
      }
    },
    /** 遍历本分区（callback(value, key)）；与 localforage.iterate 语义一致 */
    async iterate(callback) {
      if (inMemory()) {
        const prefix = `${storeName}/`;
        for (const [k, v] of memory) {
          if (k.startsWith(prefix)) await callback(v, k.slice(prefix.length));
        }
        return;
      }
      try {
        await inst.iterate(callback);
      } catch (e) {
        storageMode.value = 'memory';
        const prefix = `${storeName}/`;
        for (const [k, v] of memory) {
          if (k.startsWith(prefix)) await callback(v, k.slice(prefix.length));
        }
      }
    },
  };
}

export const db = {
  /** 等待存储探针完成（App 启动 hydrate 前先 await） */
  ready: readyPromise,
  settings: wrap('settings', settingsInst),
  records: wrap('records', recordsInst),
  wrong: wrap('wrong', wrongInst),
  meta: wrap('meta', metaInst),
};
