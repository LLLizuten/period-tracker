# 经期周期设置设计

## 背景

现有预测逻辑只支持智能预测：无记录时不预测，单条记录使用默认 28 天，多条记录使用相邻经期开始日期的平均间隔。用户希望可以手动设置自己的周期长度，用固定周期参与预测；如果不设置，则继续使用现有智能预测。

## 目标

- 在设置页增加“经期预测设置”。
- 支持用户设置固定周期长度，用于预测下一次经期开始日。
- 支持用户清空固定周期，恢复智能预测。
- 保持无记录时不预测，因为缺少最近一次经期开始日期作为基准。

## 非目标

- 不增加“经期持续天数”设置。
- 不预测下一次经期结束日。
- 不在日历上展示预计经期区间。
- 不改变经期记录的数据结构和增删改流程。

## 用户体验

设置页新增一张卡片：

- 标题：`经期预测设置`
- 当前模式：
  - 未设置周期长度：`智能预测`
  - 已设置周期长度：`固定周期：X 天`
- 说明文案：`未设置周期长度时，将根据历史记录自动估算。`
- 输入项：`周期长度`
- 输入提示：`常见周期为 21-35 天`
- 保存按钮：`保存周期`
- 清空按钮：`使用智能预测`

校验规则：

- 只接受整数天数。
- 合法范围为 `21-35`。
- 输入为空时不保存固定周期，用户需要点击 `使用智能预测` 才清空已有设置。
- 校验失败时在设置页内展示错误文案，不调用原生 Alert。

## 数据模型

新增预测设置类型：

```ts
export interface PredictionSettings {
  cycleLengthDays: number | null;
}
```

语义：

- `cycleLengthDays === null`：智能预测。
- `cycleLengthDays` 为数字：固定周期预测。

## 持久化

新增 `src/db/predictionSettings.ts`，继续使用本地 SQLite。

使用独立设置表保存用户偏好，不写入经期记录表：

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

当前只保存一个 key：

- `prediction_cycle_length_days`

公开方法：

- `initPredictionSettingsDatabase()`
- `getPredictionSettings()`
- `saveCycleLengthDays(cycleLengthDays: number)`
- `clearCycleLengthDays()`

## 预测逻辑

`predictNextPeriod` 增加可选设置参数：

```ts
predictNextPeriod(records, settings?)
```

规则：

- 无记录：返回 `null`。
- `settings.cycleLengthDays` 有值：使用固定周期。
- `settings.cycleLengthDays` 无值或未传：沿用现有智能预测。
- 下一次经期开始日期始终等于 `最新一次经期开始日期 + 周期长度`。

返回结构继续使用 `PeriodPrediction`，不新增多余字段，避免调用方过度依赖内部模式。

## 首页数据流

首页聚焦时读取经期记录和预测设置：

1. 初始化经期记录表和设置表。
2. 读取本地经期记录。
3. 读取预测设置。
4. 调用 `predictNextPeriod(records, predictionSettings)`。

首页展示文案保持简洁：

- 预计开始日期沿用现有展示。
- 如果没有记录，继续提示 `继续记录后会生成更稳定的预测`。

## 测试计划

- 预测工具：
  - 未传设置时保持现有智能预测行为。
  - `cycleLengthDays: null` 时保持智能预测行为。
  - `cycleLengthDays: 30` 时使用固定周期预测。
  - 无记录时即使有固定周期也返回 `null`。
- 设置存储：
  - 默认读取为 `{ cycleLengthDays: null }`。
  - 保存周期后可以读回。
  - 清空周期后恢复 `null`。
- 设置页：
  - 默认展示智能预测。
  - 合法输入保存后展示固定周期。
  - 非整数或超出 `21-35` 时展示页内错误。
  - 点击 `使用智能预测` 后调用清空方法并恢复智能预测。
- 首页：
  - 读取预测设置并传入预测函数。

## 原则应用

- KISS：只增加周期长度，不引入经期天数和预测区间。
- YAGNI：不提前设计健康建议、远程同步或复杂预测模型。
- DRY：固定周期和智能预测共用同一个 `predictNextPeriod` 入口。
- SOLID：设置持久化独立于经期记录表，预测工具只负责计算。
