# Period Tracker — REASONIX.md

## Stack
- **React Native** 0.81.5 + **Expo** ~54.0 — 跨平台移动 App
- **TypeScript** ~5.9, strict mode
- **expo-router** — 文件系统路由 (`app/` 目录)
- **expo-sqlite** — 本地 SQLite 持久化
- **Jest** ~29.7 + **jest-expo** — 测试框架

## Layout
- `app/` — expo-router 页面 (`(tabs)/` 为标签路由组)
- `src/components/` — UI 组件 (PeriodRecordForm, 通用 ui 组件)
- `src/db/` — SQLite DAO (periodRecords, predictionSettings)
- `src/utils/` — 纯函数工具 (date, calendar, prediction)
- `src/types/` — TypeScript 类型定义
- `src/theme.ts` — 颜色/间距/字号/圆角常量
- `docs/` — 设计文档与技术选型
- `assets/` — 图标等静态资源
- `scripts/` — 构建辅助脚本

## Commands
```sh
npm start       # Expo dev server
npm test        # Jest
npm run typecheck  # tsc --noEmit
npm run android # Expo dev → Android
npm run ios     # Expo dev → iOS
npm run web     # Expo dev → Web
```

## Conventions
- **中文注释** — 核心方法/关键逻辑必须写注释，长方法按步骤分段注释
- **git commit 用中文**，前缀按 Conventional Commits: `feat` / `fix` / `refactor` / `perf` / `test` / `chore` / `docs` / `style` / `revert` / `build`
- **named exports** 为主，`export default function` 仅用于页面组件
- **日期类型** — 全项目统一用 `DateKey = string` (格式 `YYYY-MM-DD`)，见 `src/types/period.ts`
- **测试文件** 放在 `__tests__/` 目录或 `*.test.ts` 中，与源码就近存放
- **子 Agent 分工** — 主 Agent 只负责需求理解/文档/统筹，代码编写通过子 agent 完成（见 AGENTS.md）

## Watch out for
- **无 ESLint / Prettier 配置** — 项目依赖代码约定和人工 review 保证风格一致
- **`package.json` `main` 指向 `expo-router/entry`**，非标准入口
- **app/(tabs)/ 里括号表示路由组** — expo-router 语法，不是普通目录
- **无 README** — 项目入口文档缺失，新成员先看 `docs/` 和 `AGENTS.md`
