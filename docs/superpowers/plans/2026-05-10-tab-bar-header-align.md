# 底部导航与页头统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一底部导航与页面主体视觉风格，并移除首页和设置页顶部重复标题，只保留页面内容区的标题。

**Architecture:** 保持现有 Expo Router 双 tab 结构不变，只在 `app/(tabs)/_layout.tsx` 中集中配置底部 `Tabs` 的主题样式与页头显隐，避免把导航视觉逻辑分散到页面文件。新增一个轻量测试文件校验导航配置，确保后续不会回退到默认样式或重新出现顶部重复标题。

**Tech Stack:** Expo Router、React Native、TypeScript、Jest。

---

## 协作约束

- 统筹 agent 不直接改业务代码，只负责派发、审查和验收。
- 实现子 agent 只拥有 `app/(tabs)/_layout.tsx` 与新增测试文件的修改权。
- 不执行 `git commit`、`git push`、`git reset --hard`。
- 不回退其他 agent 或用户已有改动。
- 注释保持中文；本次改动如无必要不新增注释。

## 文件结构

- Modify: `app/(tabs)/_layout.tsx`
  - 配置 `Tabs` 的 `screenOptions`，统一底部导航视觉风格并关闭默认页头。
- Create: `app/(tabs)/__tests__/_layout.test.tsx`
  - 验证 `TabsLayout` 已关闭页头、保留首页和设置两个 tab，并挂上统一的 tab bar 样式令牌。

### Task 1: 统一导航外观并移除重复页头

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/__tests__/_layout.test.tsx`
- Test: `npm test -- --runInBand "app/(tabs)/__tests__/_layout.test.tsx"`
- Test: `npm run typecheck`

- [ ] **Step 1: 先写失败测试**

在 `app/(tabs)/__tests__/_layout.test.tsx` 中：
- mock `expo-router` 的 `Tabs` 与 `Tabs.Screen`
- 导入 `TabsLayout`
- 断言根 `Tabs` 元素的 `screenOptions.headerShown` 为 `false`
- 断言 `tabBarActiveTintColor`、`tabBarInactiveTintColor`、`tabBarStyle.backgroundColor`、`tabBarStyle.borderTopColor` 已使用主题色
- 断言子节点只包含 `index` 与 `settings` 两个 tab，且标题分别是“首页”“设置”

Run: `npm test -- --runInBand "app/(tabs)/__tests__/_layout.test.tsx"`

Expected: FAIL，因为当前 `Tabs` 还没有 `screenOptions` 和统一样式。

- [ ] **Step 2: 在导航布局中实现统一配置**

在 `app/(tabs)/_layout.tsx` 中：
- 引入 `colors`、`fontSizes`、`radii`
- 为 `<Tabs>` 增加集中 `screenOptions`
- 关闭默认页头：`headerShown: false`
- 配置底部栏背景、上边框、圆角/高度/内边距，使其与现有卡片体系一致
- 配置激活与未激活文字颜色、标签字号字重
- 保留两个 `Tabs.Screen`，仅设置标题，不新增额外页面逻辑

- [ ] **Step 3: 运行测试确认转绿**

Run: `npm test -- --runInBand "app/(tabs)/__tests__/_layout.test.tsx"`

Expected: PASS，说明导航配置已满足统一样式和隐藏页头要求。

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，没有新增类型错误。
