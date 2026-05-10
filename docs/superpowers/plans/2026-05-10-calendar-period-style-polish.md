# 日历经期区间样式优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变首页日历交互和数据逻辑的前提下，修正经期区间带与选中日期高亮的视觉关系，让区间连续、选中态完整。

**Architecture:** 本次只改 `app/(tabs)/index.tsx` 的日历日期单元渲染样式，保持现有 `renderDay` 结构和 `getPeriodRangePosition` 等业务判断不变。实现重点是重新分配 `dayCell`、`periodRangeBand`、`dayContent` 这三层的尺寸、圆角与留白职责，让区间带负责连续感，内容块负责单日状态。

**Tech Stack:** Expo Router、React Native、TypeScript、Jest。

---

## 协作约束

- 统筹 agent 不直接编写业务代码，只负责派发任务、审阅结果和维护计划。
- 每个实现子 agent 必须说明自己修改的文件路径。
- 子 agent 不要执行 `git commit`、`git push`、`git reset --hard`，除非主人另行明确要求。
- 子 agent 不能回退其他 agent 或用户已有改动。
- 代码注释使用中文，核心逻辑需要简短注释。
- 按项目约定，本计划不包含任何 `git commit` 步骤。

## 文件结构

- Modify: `app/(tabs)/index.tsx`
  - 调整首页日历日期单元的容器尺寸、区间带收口方式、选中态高亮块宽度与对齐关系。
- Verify: 手动运行应用查看首页日历
  - 用已有经期记录场景验证区间连续、开始/结束圆角收口和选中高亮完整性。

## Task 1: 先写失败测试，锁定这次样式结构的回归边界

**Files:**
- Modify: `app/(tabs)/__tests__/index.test.tsx`
- Test: `npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"`

- [ ] **Step 1: 先确认首页当前是否已有测试文件**

Run:

```bash
rg --files "app/(tabs)/__tests__"
```

Expected: 如果还没有 `app/(tabs)/__tests__/index.test.tsx`，就新建它；如果已经存在，就在现有文件里追加首页日历断言。

- [ ] **Step 2: 写一个会失败的样式结构测试**

在 `app/(tabs)/__tests__/index.test.tsx` 中新增首页渲染测试，至少覆盖下面这组断言：

```ts
import { render } from "@testing-library/react-native";

import HomeScreen from "../index";

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock("../../../src/db/periodRecords", () => ({
  initPeriodDatabase: jest.fn().mockResolvedValue(undefined),
  listPeriodRecords: jest.fn().mockResolvedValue([
    { id: 1, startDate: "2026-05-04", endDate: "2026-05-09" },
  ]),
  createPeriodRecord: jest.fn(),
  updatePeriodRecord: jest.fn(),
  deletePeriodRecord: jest.fn(),
}));

test("经期区间日历单元保留底层区间带和独立日期内容块", async () => {
  const screen = render(<HomeScreen />);

  const selectedDay = await screen.findByText("13");
  const periodDay = await screen.findByText("4");

  expect(selectedDay).toBeTruthy();
  expect(periodDay).toBeTruthy();
});
```

然后继续补一个基于 `StyleSheet.flatten` 的样式断言，目标是让测试先因为找不到新的样式键或样式值不匹配而失败。实现后断言应至少引用这些样式名：

```ts
expect(styles.periodRangeBandStart).toBeDefined();
expect(styles.dayContent).toBeDefined();
expect(styles.selectedDay).toBeDefined();
```

- [ ] **Step 3: 运行测试确认当前失败**

Run: `npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"`

Expected: FAIL，原因应是首页测试文件缺失、样式未导出不可测，或断言的目标样式结构与当前实现不一致。不要跳过失败验证。

## Task 2: 最小改动修正日历日期单元的视觉层级

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Test: `npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"`

- [ ] **Step 1: 先阅读当前日历单元相关代码**

Run:

```bash
rg -n "renderDay|dayCell|periodRangeBand|dayContent|selectedDay" "app/(tabs)/index.tsx"
sed -n '480,940p' "app/(tabs)/index.tsx"
```

Expected: 明确当前实现是 `Pressable -> periodRangeBand -> dayContent -> Text` 四层结构，并确认区间带和内容块都接近铺满整格宽度。

- [ ] **Step 2: 调整 `renderDay` 的包裹结构，让区间带和内容块职责分离**

在 `renderDay` 里保留现有状态判断，结构改成下面这种层次：

```tsx
<Pressable ... style={[styles.dayCell, ...]}>
  <View style={styles.dayTrack}>
    <View
      style={[
        styles.periodRangeBand,
        isMarked ? styles.visiblePeriodRangeBand : null,
        periodRangePosition?.isStart ? styles.periodRangeBandStart : null,
        periodRangePosition?.isEnd ? styles.periodRangeBandEnd : null,
        isSingleDayPeriod ? styles.periodRangeBandSingleDay : null,
      ]}
    />
    <View
      style={[
        styles.dayContent,
        isPendingStart && styles.pendingStartDay,
        isSelected && styles.selectedDay,
        isSelected && isPendingStart ? styles.selectedPendingStartDay : null,
      ]}
    >
      <Text ...>{day.dayOfMonth}</Text>
    </View>
  </View>
</Pressable>
```

关键点：

- `periodRangeBand` 改成绝对定位或明确位于底层，单独负责连续区间，不再包住 `dayContent`。
- `dayContent` 保持单独居中，不再默认占满整格宽度。
- 不修改 `isMarked`、`isSelected`、`isPendingStart` 的业务判断。

- [ ] **Step 3: 按 spec 调整相关样式值**

在 `StyleSheet.create` 中把日历单元相关样式至少调整到下面这个方向：

```ts
dayCell: {
  aspectRatio: 1,
  minHeight: 42,
  paddingVertical: spacing.xs,
  width: "14.2857%",
},
dayTrack: {
  alignItems: "center",
  flex: 1,
  justifyContent: "center",
  position: "relative",
},
periodRangeBand: {
  backgroundColor: "transparent",
  height: 28,
  left: 4,
  position: "absolute",
  right: 4,
},
visiblePeriodRangeBand: {
  backgroundColor: colors.surfaceSoft,
},
periodRangeBandStart: {
  borderBottomLeftRadius: radii.md,
  borderTopLeftRadius: radii.md,
  left: 8,
},
periodRangeBandEnd: {
  borderBottomRightRadius: radii.md,
  borderTopRightRadius: radii.md,
  right: 8,
},
periodRangeBandSingleDay: {
  borderRadius: radii.md,
},
dayContent: {
  alignItems: "center",
  aspectRatio: 1,
  backgroundColor: colors.surface,
  borderRadius: radii.md,
  height: 42,
  justifyContent: "center",
  width: 42,
},
selectedDay: {
  backgroundColor: colors.primary,
},
```

允许根据真机观感做 2 到 4 像素级别微调，但必须满足：

- 区间带左右端点轻微内收。
- `dayContent` 不再占满区间带宽度。
- 选中态仍是完整独立圆角块。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"`

Expected: PASS，测试能够证明首页仍可渲染，且样式结构已切换到“底层区间带 + 独立内容块”模式。

## Task 3: 类型检查和手动验证，确认没有引入视觉回归

**Files:**
- Modify: `app/(tabs)/index.tsx`（如需根据验证结果做 2-4 像素微调）
- Test: `npm run typecheck`
- Verify: 本地启动应用手动查看首页

- [ ] **Step 1: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，没有因为新增 `dayTrack` 或 `renderDay` 结构调整引入类型错误。

- [ ] **Step 2: 启动应用做手动验证**

Run:

```bash
npx expo start --clear
```

Expected: 能打开 Expo 开发页，并在首页手动确认以下场景：

- 已记录经期 `2026-05-04` 到 `2026-05-09` 仍显示为连续浅粉色带。
- 选中 `2026-05-13` 时，高亮块左右完整，不再出现右侧缺口观感。
- 选中经期区间中的某一天时，高亮块仍完整，区间带仍能辨认出连续关系。
- 开始日、结束日、单日经期的圆角收口自然。

- [ ] **Step 3: 如手动验证发现偏差，只做最小样式微调并重复检查**

如果真机或模拟器里仍有轻微不对齐，只允许在 `app/(tabs)/index.tsx` 中微调这些值：

```ts
left: 4,
right: 4,
left: 8,
right: 8,
height: 28,
width: 42,
height: 42,
```

调完后重复运行：

```bash
npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"
npm run typecheck
```

Expected: 两个命令都 PASS，且视觉问题被解决。

## 自检结论

- Spec 覆盖：已覆盖“连续区间优先”“端点轻微内收”“选中块完整”“不改交互逻辑”“手动验证”的全部要求。
- 占位检查：计划中没有 `TODO`、`TBD` 或“自行实现”这类空指令。
- 类型一致性：所有步骤都围绕现有 `renderDay`、`periodRangeBand`、`dayContent`、`selectedDay` 命名展开，没有引入第二套渲染分支。
