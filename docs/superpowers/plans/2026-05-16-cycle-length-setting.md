# 经期周期设置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页支持用户保存 21-35 天的固定周期长度，并让首页预测在固定周期和现有智能预测之间切换。

**Architecture:** 预测计算仍集中在 `src/utils/prediction.ts`。用户偏好用独立 SQLite 设置表保存到 `src/db/predictionSettings.ts`，不污染经期记录表。设置页负责读写周期设置，首页读取设置后传给预测函数。

**Tech Stack:** Expo Router, React Native, TypeScript, expo-sqlite, Jest, react-test-renderer.

---

## File Structure

- `src/types/period.ts`：新增 `PredictionSettings` 类型。
- `src/utils/prediction.ts`：让 `predictNextPeriod` 接受可选预测设置。
- `src/utils/prediction.test.ts`：覆盖固定周期和智能预测兼容行为。
- `src/db/predictionSettings.ts`：新增本地设置表和周期设置读写方法。
- `src/db/predictionSettings.test.ts`：覆盖默认值、保存、清空。
- `app/(tabs)/settings.tsx`：新增“经期预测设置”卡片，包含输入、保存、清空和页内错误。
- `app/(tabs)/__tests__/settings.test.tsx`：覆盖设置页展示和交互。
- `app/(tabs)/index.tsx`：读取预测设置并传给预测函数。
- `app/(tabs)/__tests__/index.test.tsx`：覆盖首页加载预测设置。

---

## Task 1: Prediction Function Supports Fixed Cycle

**Files:**
- Modify: `src/types/period.ts`
- Modify: `src/utils/prediction.ts`
- Test: `src/utils/prediction.test.ts`

- [ ] **Step 1: Write failing prediction tests**

Add these tests inside `describe("prediction utilities", () => { ... })`:

```ts
  test("固定周期设置有值时使用固定周期预测", () => {
    expect(
      predictNextPeriod([createRecord(1, "2026-05-09")], {
        cycleLengthDays: 30,
      }),
    ).toEqual({
      nextStartDate: "2026-06-08",
      cycleLength: 30,
      basedOnRecordCount: 1,
    });
  });

  test("固定周期设置为空时继续使用智能预测", () => {
    const records = [
      createRecord(1, "2026-01-01"),
      createRecord(2, "2026-01-29"),
      createRecord(3, "2026-02-28"),
    ];

    expect(predictNextPeriod(records, { cycleLengthDays: null })).toEqual({
      nextStartDate: "2026-03-29",
      cycleLength: 29,
      basedOnRecordCount: 3,
    });
  });

  test("无记录时即使设置固定周期也不预测", () => {
    expect(predictNextPeriod([], { cycleLengthDays: 30 })).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/utils/prediction.test.ts --runInBand
```

Expected: FAIL because `predictNextPeriod` does not accept settings yet.

- [ ] **Step 3: Add the settings type**

Update `src/types/period.ts`:

```ts
export interface PredictionSettings {
  cycleLengthDays: number | null;
}
```

- [ ] **Step 4: Implement minimal prediction support**

Update `src/utils/prediction.ts` imports and signature:

```ts
import type {
  PeriodPrediction,
  PeriodRecord,
  PredictionSettings,
} from "../types/period";
```

Change function signature and add fixed-cycle branch after the `latestRecord === null` guard:

```ts
export function predictNextPeriod(
  records: PeriodRecord[],
  settings?: PredictionSettings,
): PeriodPrediction | null {
  const latestRecord = getLatestRecord(records);

  if (latestRecord === null) {
    return null;
  }

  if (settings?.cycleLengthDays !== null && settings?.cycleLengthDays !== undefined) {
    return {
      nextStartDate: addDays(latestRecord.startDate, settings.cycleLengthDays),
      cycleLength: settings.cycleLengthDays,
      basedOnRecordCount: records.length,
    };
  }

  if (records.length === 1) {
    return {
      nextStartDate: addDays(latestRecord.startDate, DEFAULT_CYCLE_LENGTH),
      cycleLength: DEFAULT_CYCLE_LENGTH,
      basedOnRecordCount: 1,
    };
  }
```

Leave the existing multi-record average logic unchanged.

- [ ] **Step 5: Run prediction tests**

Run:

```bash
npm test -- src/utils/prediction.test.ts --runInBand
```

Expected: PASS.

---

## Task 2: Prediction Settings Persistence

**Files:**
- Create: `src/db/predictionSettings.ts`
- Create: `src/db/predictionSettings.test.ts`

- [ ] **Step 1: Write failing persistence tests**

Create `src/db/predictionSettings.test.ts`:

```ts
/**
 * @jest-environment node
 */

import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "./predictionSettings";

const execAsync = jest.fn();
const getFirstAsync = jest.fn();
const runAsync = jest.fn();
const openDatabaseAsync = jest.fn(() => ({
  execAsync,
  getFirstAsync,
  runAsync,
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...args: unknown[]) => openDatabaseAsync(...args),
}));

describe("prediction settings database", () => {
  beforeEach(() => {
    execAsync.mockClear();
    getFirstAsync.mockReset();
    runAsync.mockClear();
    openDatabaseAsync.mockClear();
  });

  test("默认读取智能预测设置", async () => {
    getFirstAsync.mockResolvedValue(null);

    await expect(getPredictionSettings()).resolves.toEqual({
      cycleLengthDays: null,
    });
  });

  test("保存周期后可以读回固定周期", async () => {
    getFirstAsync.mockResolvedValue({ value: "30" });

    await expect(getPredictionSettings()).resolves.toEqual({
      cycleLengthDays: 30,
    });
  });

  test("保存周期使用固定 key 写入设置表", async () => {
    await saveCycleLengthDays(30);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO app_settings"),
      "prediction_cycle_length_days",
      "30",
    );
  });

  test("清空周期删除固定 key", async () => {
    await clearCycleLengthDays();

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM app_settings"),
      "prediction_cycle_length_days",
    );
  });

  test("初始化会创建设置表", async () => {
    await initPredictionSettingsDatabase();

    expect(execAsync).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS app_settings"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/db/predictionSettings.test.ts --runInBand
```

Expected: FAIL because `src/db/predictionSettings.ts` does not exist.

- [ ] **Step 3: Implement settings database module**

Create `src/db/predictionSettings.ts`:

```ts
import * as SQLite from "expo-sqlite";

import type { PredictionSettings } from "../types/period";

const DATABASE_NAME = "period-tracker.db";
const TABLE_NAME = "app_settings";
const CYCLE_LENGTH_KEY = "prediction_cycle_length_days";

type SettingRow = {
  value: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);

  return databasePromise;
}

// 初始化应用设置表，预测设置读写都依赖这张本地 key-value 表。
export async function initPredictionSettingsDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

// 读取周期设置；没有保存值时使用智能预测。
export async function getPredictionSettings(): Promise<PredictionSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<SettingRow>(
    `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
    CYCLE_LENGTH_KEY,
  );

  return {
    cycleLengthDays: row ? Number(row.value) : null,
  };
}

// 保存用户自定义周期长度，用固定周期替代智能预测。
export async function saveCycleLengthDays(cycleLengthDays: number): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
    CYCLE_LENGTH_KEY,
    String(cycleLengthDays),
  );
}

// 删除自定义周期长度，恢复智能预测。
export async function clearCycleLengthDays(): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `DELETE FROM ${TABLE_NAME} WHERE key = ?`,
    CYCLE_LENGTH_KEY,
  );
}
```

- [ ] **Step 4: Run persistence tests**

Run:

```bash
npm test -- src/db/predictionSettings.test.ts --runInBand
```

Expected: PASS.

---

## Task 3: Settings Screen Cycle Length UI

**Files:**
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/(tabs)/__tests__/settings.test.tsx`

- [ ] **Step 1: Write failing settings screen tests**

Extend `app/(tabs)/__tests__/settings.test.tsx` mock imports:

```ts
import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "../../../src/db/predictionSettings";
```

Add mock:

```ts
jest.mock("../../../src/db/predictionSettings", () => ({
  clearCycleLengthDays: jest.fn().mockResolvedValue(undefined),
  getPredictionSettings: jest.fn(),
  initPredictionSettingsDatabase: jest.fn().mockResolvedValue(undefined),
  saveCycleLengthDays: jest.fn().mockResolvedValue(undefined),
}));
```

Add mocked constants:

```ts
const mockInitPredictionSettingsDatabase = jest.mocked(initPredictionSettingsDatabase);
const mockGetPredictionSettings = jest.mocked(getPredictionSettings);
const mockSaveCycleLengthDays = jest.mocked(saveCycleLengthDays);
const mockClearCycleLengthDays = jest.mocked(clearCycleLengthDays);
```

In `beforeEach`, add:

```ts
    mockInitPredictionSettingsDatabase.mockResolvedValue(undefined);
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: null });
    mockSaveCycleLengthDays.mockResolvedValue(undefined);
    mockClearCycleLengthDays.mockResolvedValue(undefined);
```

Add tests:

```ts
  test("默认展示智能预测模式", async () => {
    const renderer = await renderSettingsScreen();

    expect((renderer.root as TestNode).findByProps({ children: "智能预测" })).toBeDefined();
    expect(
      (renderer.root as TestNode).findByProps({
        children: "未设置周期长度时，将根据历史记录自动估算。",
      }),
    ).toBeDefined();
  });

  test("保存合法周期后展示固定周期", async () => {
    const renderer = await renderSettingsScreen();
    const input = (renderer.root as TestNode).findByProps({ placeholder: "21-35" });

    await act(async () => {
      input.props.onChangeText("30");
    });

    await act(async () => {
      const saveButton = findPressableByText(renderer.root as TestNode, "保存周期");
      (saveButton.props as PressableTestProps).onPress?.();
    });

    expect(mockSaveCycleLengthDays).toHaveBeenCalledWith(30);
    expect((renderer.root as TestNode).findByProps({ children: "固定周期：30 天" })).toBeDefined();
  });

  test("周期超出范围时展示页内错误", async () => {
    const renderer = await renderSettingsScreen();
    const input = (renderer.root as TestNode).findByProps({ placeholder: "21-35" });

    await act(async () => {
      input.props.onChangeText("40");
    });

    await act(async () => {
      const saveButton = findPressableByText(renderer.root as TestNode, "保存周期");
      (saveButton.props as PressableTestProps).onPress?.();
    });

    expect(mockSaveCycleLengthDays).not.toHaveBeenCalled();
    expect(
      (renderer.root as TestNode).findByProps({
        children: "周期长度需为 21-35 天的整数。",
      }),
    ).toBeDefined();
  });

  test("点击使用智能预测会清空固定周期", async () => {
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: 30 });
    const renderer = await renderSettingsScreen();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "使用智能预测");
      (clearButton.props as PressableTestProps).onPress?.();
    });

    expect(mockClearCycleLengthDays).toHaveBeenCalled();
    expect((renderer.root as TestNode).findByProps({ children: "智能预测" })).toBeDefined();
  });
```

- [ ] **Step 2: Run settings screen tests to verify failure**

Run:

```bash
npm test -- "app/(tabs)/__tests__/settings.test.tsx" --runInBand
```

Expected: FAIL because settings UI does not include prediction settings yet.

- [ ] **Step 3: Implement settings UI**

Modify `app/(tabs)/settings.tsx`:

```ts
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
```

Add UI imports:

```ts
  PrimaryButton,
  SecondaryButton,
  StatusMessage,
```

Add settings imports:

```ts
import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "../../src/db/predictionSettings";
```

Add state:

```ts
  const [cycleLengthDays, setCycleLengthDays] = useState<number | null>(null);
  const [cycleLengthInput, setCycleLengthInput] = useState("");
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
```

Inside `loadRecordCount`, after `await initPeriodDatabase();`, add:

```ts
      await initPredictionSettingsDatabase();
      const predictionSettings = await getPredictionSettings();
```

Inside `if (isActive())`, add:

```ts
        setCycleLengthDays(predictionSettings.cycleLengthDays);
        setCycleLengthInput(
          predictionSettings.cycleLengthDays === null
            ? ""
            : String(predictionSettings.cycleLengthDays),
        );
        setSettingsError(null);
        setSettingsMessage(null);
```

Add handlers before `handleClearRecords`:

```ts
  const handleSaveCycleLength = async () => {
    const nextCycleLength = Number(cycleLengthInput);

    if (!Number.isInteger(nextCycleLength) || nextCycleLength < 21 || nextCycleLength > 35) {
      setSettingsMessage(null);
      setSettingsError("周期长度需为 21-35 天的整数。");
      return;
    }

    try {
      setIsSavingSettings(true);
      await initPredictionSettingsDatabase();
      await saveCycleLengthDays(nextCycleLength);
      setCycleLengthDays(nextCycleLength);
      setSettingsError(null);
      setSettingsMessage("周期设置已保存。");
    } catch {
      setSettingsMessage(null);
      setSettingsError("保存失败，请稍后重试。");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUseSmartPrediction = async () => {
    try {
      setIsSavingSettings(true);
      await initPredictionSettingsDatabase();
      await clearCycleLengthDays();
      setCycleLengthDays(null);
      setCycleLengthInput("");
      setSettingsError(null);
      setSettingsMessage("已恢复智能预测。");
    } catch {
      setSettingsMessage(null);
      setSettingsError("恢复失败，请稍后重试。");
    } finally {
      setIsSavingSettings(false);
    }
  };
```

Add the card before the data save description card:

```tsx
        <SectionCard style={styles.infoCard}>
          <LabelText>经期预测设置</LabelText>
          <Text style={styles.modeText}>
            {cycleLengthDays === null ? "智能预测" : `固定周期：${cycleLengthDays} 天`}
          </Text>
          <Text style={styles.bodyText}>
            未设置周期长度时，将根据历史记录自动估算。
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>周期长度</Text>
            <TextInput
              value={cycleLengthInput}
              onChangeText={setCycleLengthInput}
              placeholder="21-35"
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.helperText}>常见周期为 21-35 天</Text>
          </View>
          {settingsError ? (
            <StatusMessage tone="error">{settingsError}</StatusMessage>
          ) : null}
          {settingsMessage ? (
            <StatusMessage tone="success">{settingsMessage}</StatusMessage>
          ) : null}
          <View style={styles.settingActions}>
            <PrimaryButton
              onPress={handleSaveCycleLength}
              disabled={isSavingSettings}
              style={styles.settingActionButton}
            >
              {isSavingSettings ? "保存中..." : "保存周期"}
            </PrimaryButton>
            <SecondaryButton
              onPress={handleUseSmartPrediction}
              disabled={isSavingSettings || cycleLengthDays === null}
              style={styles.settingActionButton}
            >
              使用智能预测
            </SecondaryButton>
          </View>
        </SectionCard>
```

Add styles:

```ts
  modeText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  settingActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  settingActionButton: {
    flex: 1,
  },
```

- [ ] **Step 4: Run settings tests**

Run:

```bash
npm test -- "app/(tabs)/__tests__/settings.test.tsx" --runInBand
```

Expected: PASS.

---

## Task 4: Home Screen Uses Prediction Settings

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/__tests__/index.test.tsx`

- [ ] **Step 1: Write failing home integration test**

Update imports in `app/(tabs)/__tests__/index.test.tsx`:

```ts
import { getPredictionSettings } from "../../../src/db/predictionSettings";
```

Add mock:

```ts
jest.mock("../../../src/db/predictionSettings", () => ({
  getPredictionSettings: jest.fn().mockResolvedValue({ cycleLengthDays: 30 }),
  initPredictionSettingsDatabase: jest.fn().mockResolvedValue(undefined),
}));
```

Add constant:

```ts
const mockGetPredictionSettings = jest.mocked(getPredictionSettings);
```

Add test:

```ts
  test("首页使用固定周期设置预测下一次开始日期", async () => {
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: 30 });
    jest.mocked(listPeriodRecords).mockResolvedValue([
      {
        id: 1,
        startDate: "2026-05-04",
        endDate: "2026-05-09",
        createdAt: "2026-05-04",
        updatedAt: "2026-05-09",
      },
    ]);

    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    expect(renderer!.root.findByProps({ children: "2026年6月3日" })).toBeDefined();
  });
```

- [ ] **Step 2: Run home test to verify failure**

Run:

```bash
npm test -- "app/(tabs)/__tests__/index.test.tsx" --runInBand
```

Expected: FAIL because homepage does not read prediction settings.

- [ ] **Step 3: Implement home data flow**

Modify `app/(tabs)/index.tsx` imports:

```ts
import {
  getPredictionSettings,
  initPredictionSettingsDatabase,
} from "../../src/db/predictionSettings";
import type { DateKey, PeriodRecord, PredictionSettings } from "../../src/types/period";
```

Add state near records state:

```ts
  const [predictionSettings, setPredictionSettings] = useState<PredictionSettings>({
    cycleLengthDays: null,
  });
```

Change prediction memo:

```ts
  const prediction = useMemo(
    () => predictNextPeriod(records, predictionSettings),
    [predictionSettings, records],
  );
```

Inside `loadRecords`, after `await initPeriodDatabase();`, add:

```ts
        await initPredictionSettingsDatabase();
        const nextPredictionSettings = await getPredictionSettings();
```

Inside `if (isActive())`, add:

```ts
        setPredictionSettings(nextPredictionSettings);
```

- [ ] **Step 4: Run home tests**

Run:

```bash
npm test -- "app/(tabs)/__tests__/index.test.tsx" --runInBand
```

Expected: PASS.

---

## Task 5: Full Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/utils/prediction.test.ts src/db/predictionSettings.test.ts "app/(tabs)/__tests__/settings.test.tsx" "app/(tabs)/__tests__/index.test.tsx" --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Inspect working tree**

Run:

```bash
git status --short
```

Expected: only files related to this feature and the spec/plan are changed.

No commit should be created unless the user explicitly asks for it.

---

## Self-Review

- Spec coverage: The plan covers fixed cycle storage, settings UI, prediction calculation, home integration, validation, and tests.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: The single setting shape is `PredictionSettings { cycleLengthDays: number | null }` across all tasks.
