import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base 使用相对路径：hash 路由 + 相对资源引用，
// 产物可以放在任意静态目录（含子路径）直接部署，刷新不会 404
export default defineConfig({
  plugins: [vue()],
  base: './',
  // vitest 配置：数独引擎是纯函数模块，node 环境即可测试
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
