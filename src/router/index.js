/**
 * 路由：createWebHashHistory —— hash 模式下刷新/直链都由前端接管，
 * 静态部署到任意目录（含对象存储、GitHub Pages）都不会 404
 */
import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '趣味数独' },
  },
  {
    // query: diff=easy4/easy6/normal9/hard9；sig=错题指纹（重练模式）
    path: '/game',
    name: 'game',
    component: () => import('../views/GameView.vue'),
    meta: { title: '游戏中 · 趣味数独' },
  },
  {
    path: '/errorbook',
    name: 'errorbook',
    component: () => import('../views/ErrorbookView.vue'),
    meta: { title: '错题本 · 趣味数独' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('../views/StatsView.vue'),
    meta: { title: '统计 · 趣味数独' },
  },
  {
    path: '/learn',
    name: 'learn',
    component: () => import('../views/LearnView.vue'),
    meta: { title: '数独学堂 · 趣味数独' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '设置 · 趣味数独' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = to.meta.title || '趣味数独';
});

export default router;
