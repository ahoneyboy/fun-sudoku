# 趣味数独 Fun Sudoku

面向 6-12 岁小朋友的卡通数独单机 Web 应用。四宫 / 六宫 / 九宫循序渐进，题目 100% 唯一解，
提示会讲"为什么"，只有小失误、没有失败惩罚。纯前端实现：无后端、无账号，数据保存在浏览器 IndexedDB。

线上地址（GitHub Pages）：`https://ahoneyboy.github.io/fun-sudoku/`

## 技术栈

- Vue 3（`<script setup>` 组合式 API）+ Vite + JavaScript
- Tailwind CSS（响应式全部使用断点前缀，无手写媒体查询）
- Pinia（`useXxxStore`）+ Vue Router 4（`createWebHashHistory`，静态部署刷新不 404）
- ECharts + vue-echarts（按需注册：CanvasRenderer、Bar/Line/Pie、Grid/Tooltip/Legend）
- localforage（IndexedDB，库名 `fun-sudoku`；浏览器禁用时自动降级内存模式并提示）
- lucide-vue-next 内联 SVG 图标（全站无 emoji 图标）
- WebAudio 现场合成音效（无音频文件）
- vitest（数独引擎自测）

## 运行

```bash
npm install
npm run dev      # 开发：http://localhost:5173
npm test         # 数独引擎自测：4 难度各 100 题唯一解等断言
npm run build    # 产物输出到 dist/（纯静态，可直接部署）
npm run preview  # 本地预览构建产物
```

## 部署

产物为纯静态文件，`vite.config.js` 已设 `base: './'` 且路由为 hash 模式，
可放在任意静态目录 / 子路径（对象存储、Nginx、GitHub Pages 等），刷新不会 404。

本仓库已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：
推送到 `main` 自动执行 `npm ci → npm test → npm run build` 并发布到 GitHub Pages
（Pages 来源需在仓库 Settings → Pages 中选择 "GitHub Actions"，首次启用见下文）。

## 功能清单

- **首页**：四档难度入口（含最佳用时/通关次数）、战绩概览（今日完成/累计星星/累计通关）、功能入口
- **游戏页** `/game?diff=easy4|easy6|normal9|hard9`（可选 `&sig=指纹` 进入错题重练）
  - 难度参数：四宫挖 8 / 六宫挖 14 / 九宫普通挖 36 / 九宫困难挖 50，提示均 3 次
  - 引擎：位掩码 + MRV 回溯生成终盘；逐格挖空、每步用解数统计器（上限 2）保证唯一解
  - 取题优先级：错题重练 → IndexedDB 预生成缓存池（FIFO，空闲自动补 2 题）→ 现场生成（<5ms）
  - 选中格高亮 + 同行/列/宫淡紫 + 同数字奶油黄；宫粗线淡紫、宫内极浅细线；格子永远正方形
  - 数字键盘显示剩余数量，剩 0 置灰禁填；题目给定格不可改
  - 实时错误提示（可关）：填错标红计 1 次小失误，同格连错只记 1 次，改对后重新计
  - 工具栏：提示（附"为什么"三级讲解）/ 擦除 / 重置（二次确认）/ 检查
  - 填满自动校验通关；检查发现错误会标红 + 收录错题本（同题去重、最新在前）
  - 计时可点击隐藏（后台照常计时）；切后台自动暂停、回前台恢复
  - 通关弹窗：星星逐个弹出；星级 = 失误+提示（0→3 星，≤4→2 星，其余 1 星）；
    错题重练通关自动移出错题本并特别祝贺
  - 首次游玩温柔引导去学堂（只出现一次）；PC（≥lg）支持方向键/数字键/Backspace/H/C
- **错题本**：迷你盘面预览（题目格/空格两色）、收录时间、再挑战、单条移除、一键清空（二次确认）、上限 50 条
- **统计页**：今日/星星/通关数字卡；近 7/30 天做题量柱状图、各难度通关饼图、平均用时趋势折线、各难度最佳用时；空数据友好空状态
- **数独学堂**：规则图解 + 解题三招（只差一个 / 排除法 / 先易后难）+ 随堂测验 3 题（固定合法终盘，答错摇头鼓励，全对毕业）
- **设置**：轻柔音效 / 实时错误提示开关；数据导出（JSON）/ 导入（校验 + 二次确认全量覆盖）/ 清除记录 / 清空错题本 / 恢复出厂；关于
- **响应式**：手机底部 TabBar、Pad+ 左侧边栏（可折叠）、PC 游戏页左右两栏；触控与鼠标均友好

## 数据导出 / 导入

- **导出**：设置 → 数据管理 → 导出数据，下载 `fun-sudoku-backup-YYYYMMDD-HHmm.json`，
  结构为 `{ version: 1, exportedAt, settings, records, wrongbook }`
- **导入**：选择备份文件 → 校验版本与字段结构 → 二次确认 → 全量覆盖本地设置/记录/错题本
- 数据存储于浏览器 IndexedDB（库名 `fun-sudoku`），清除浏览器数据会抹掉记录，请先导出备份

## 目录结构

```
src/
├── main.js / App.vue          # 入口与三端骨架布局
├── router/index.js            # hash 路由
├── stores/                    # db(存储封装) settings records wrongbook game ui
├── core/                      # sudoku(引擎) audio(WebAudio) format(工具) echarts(按需注册)
├── components/                # SudokuBoard NumberPad GameToolbar WinModal ConfirmDialog
│                              # AppToast MiniBoard StatCard AppSidebar BottomTabBar
│                              # BaseToggle EmptyState
├── views/                     # Home Game Errorbook Stats Learn Settings
└── assets/index.css           # Tailwind 入口 + 动画关键帧
tests/sudoku.test.js           # 引擎自测（vitest）
.github/workflows/deploy.yml   # GitHub Pages 自动部署
```

## 验收清单

- [x] 四种难度各现场生成 100 题，`countSolutions(...,2)===1` 全部成立（`npm test`，7/7 通过）
- [x] 手机 / Pad / PC 三种视口：布局不塌不溢出、格子始终正方形、导航形态正确切换
      （见 `screenshots/mobile-home.png`、`screenshots/pad-home.png`、`screenshots/pc-game.png`）
- [x] 完整通关四宫：填对变蓝、填错标红计失误、提示讲解出现、填满自动判通关、
      星级公式正确（实测 0/0 → 3 星、1/1 → 2 星）、记录入库、首页「今日完成」+1（浏览器 e2e 实测）
- [x] 检查出错的题进入错题本；再挑战通关后自动移出并特别祝贺（浏览器 e2e 实测）
- [x] 实时提示关闭后填错不标红（逻辑分叉见 `stores/game.js` `inputDigit`）；
      计时隐藏后照常计时、通关成绩正确；切后台自动暂停（visibilitychange）
- [x] 随堂测验 3 题答案与讲解正确（4 / 3 / 1），答错有摇头与鼓励（浏览器 e2e 实测）
- [x] 统计页三张图表随记录变化正确渲染，空数据有空状态（浏览器 e2e 实测）
- [x] 导出 JSON → 清空 → 导入可完整还原（格式校验 + 全量覆盖，见 `stores/*.replaceAll`）
- [x] 音效四类（tap/ok/err/win）WebAudio 合成，受开关控制，合成失败静默降级；
      全站无 emoji 图标，图标均为 lucide SVG
- [x] `npm run build` 产物纯静态、hash 路由刷新不 404，已部署 GitHub Pages 并线上验证

## 说明

- 工程在规格要求的 stores 之外补充了 `stores/db.js`（localforage 统一封装与内存降级）与
  `stores/ui.js`（全局 Toast 队列），组件依旧不直接操作 localforage。
- ECharts 仅在统计页路由懒加载（StatsView chunk 独立），首屏体积不受影响。
