/** @type {import('tailwindcss').Config} */
export default {
  // 内容扫描：模板里所有字面量 class 都能被 JIT 收集
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // 奶油底 + 马卡龙五色（soft=浅底 / deep=深色文字与描边）
        cream: '#FDF3E3',
        ink: { DEFAULT: '#5B4A54', soft: '#9A8893' },
        mint: { soft: '#E0F6EA', deep: '#2E8B62' },
        butter: { soft: '#FFF3D1', deep: '#B07E10' },
        azure: { soft: '#E0EEFF', deep: '#3D6FB5' },
        lilac: { soft: '#EFE5FF', deep: '#7A55C0' },
        blossom: { soft: '#FFE4EA', deep: '#E05C75' },
        // 数字三色：题目给定=深暖炭、用户填写=蓝、错误=红
        'user-blue': '#4E8DF5',
        'error-red': '#FF5A76',
      },
      fontFamily: {
        // 中文优先栈：PingFang SC（macOS/iOS）→ Microsoft YaHei（Windows）→ 系统兜底
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        // 糖果按钮：底部实色厚阴影，配合 active:translate-y-0.5 形成按压下沉
        candy: '0 4px 0 0 rgb(0 0 0 / 0.10)',
        'candy-sm': '0 3px 0 0 rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
};
