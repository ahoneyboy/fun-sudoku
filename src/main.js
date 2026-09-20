/**
 * 应用入口：Pinia（状态） + Router（hash 路由） + 全局样式
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/index.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
