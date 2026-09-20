/**
 * ECharts 按需注册：只引入用到的渲染器/图表/组件，
 * 相比全量引入可显著减小构建体积（spec：CanvasRenderer + 柱/折/饼 + Grid/Tooltip/Legend）
 */
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);
