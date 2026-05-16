import { act, create } from "react-test-renderer";
import { Alert, Modal, StyleSheet } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import HomeScreen from "../index";
import { colors } from "../../../src/theme";
import { listPeriodRecords } from "../../../src/db/periodRecords";
import { getPredictionSettings } from "../../../src/db/predictionSettings";

type FlattenedStyle = {
  backgroundColor?: string;
  color?: string;
  overflow?: string;
};

type RendererRoot = ReactTestInstance & {
  findByType: (type: unknown) => ReactTestInstance;
  findByProps: (props: Record<string, unknown>) => ReactTestInstance;
};

let mockLatestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");

    mockLatestFocusEffect = callback;
    React.useEffect(() => callback(), [callback]);
  },
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

jest.mock("../../../src/db/predictionSettings", () => ({
  getPredictionSettings: jest.fn().mockResolvedValue({ cycleLengthDays: null }),
  initPredictionSettingsDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe("HomeScreen", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 13, 12, 0, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("首页使用固定周期设置预测下一次开始日期", async () => {
    jest.mocked(getPredictionSettings).mockResolvedValue({ cycleLengthDays: 30 });
    jest.mocked(listPeriodRecords).mockResolvedValue([
      {
        id: 1,
        startDate: "2026-05-04",
        endDate: "2026-05-09",
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ]);

    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    expect((renderer!.root as RendererRoot).findByProps({ children: "2026年6月3日" })).toBeDefined();
  });

  test("经期区间日历单元保留底层区间带和独立日期内容块", async () => {
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    const getTextContent = (node: { children?: unknown[] | string | number | null }) => {
      const { children } = node;

      if (Array.isArray(children)) {
        return children
          .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
          .join("");
      }

      return children;
    };

    const getNodeStyle = (node: { props?: { style?: unknown } } | null | undefined): FlattenedStyle | undefined =>
      StyleSheet.flatten(node?.props?.style) as FlattenedStyle | undefined;

    const findAncestor = (
      node: {
        parent?: { props: { onPress?: unknown }; parent?: { props: { onPress?: unknown }; parent?: unknown } | null } | null;
      },
      predicate: (candidate: { props?: { onPress?: unknown } }) => boolean,
    ) => {
      let current = node.parent;

      while (current) {
        if (predicate(current)) {
          return current;
        }

        current = current.parent as typeof current | undefined;
      }

      return null;
    };

    const findDescendant = (
      root: { children?: unknown[] },
      predicate: (candidate: { type?: unknown; props?: { style?: unknown } }) => boolean,
    ) => {
      const stack = [...(root.children ?? [])].reverse();

      while (stack.length > 0) {
        const current = stack.pop();

        if (!current || typeof current !== "object") {
          continue;
        }

        const candidate = current as { type?: unknown; props?: { style?: unknown }; children?: unknown[] };

        if (predicate(candidate)) {
          return candidate;
        }

        if (Array.isArray(candidate.children) && candidate.children.length > 0) {
          stack.push(...candidate.children.slice().reverse());
        }
      }

      return null;
    };

    const getCalendarDay = (
      label: string,
      textColor: string,
    ) =>
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          getTextContent(node) === label &&
          getNodeStyle(node)?.color === textColor,
      );

    const selectedDay = getCalendarDay("13", colors.onPrimary);
    const periodDay = getCalendarDay("4", colors.rose);

    expect(selectedDay).toBeDefined();
    expect(periodDay).toBeDefined();

    const selectedDayPressable = findAncestor(selectedDay, (candidate) => typeof candidate.props?.onPress === "function");
    const periodDayPressable = findAncestor(periodDay, (candidate) => typeof candidate.props?.onPress === "function");

    const selectedDayContent = findDescendant(selectedDayPressable as { children?: unknown[] }, (candidate) => {
      const style = getNodeStyle(candidate);

      return candidate.type === "View" && style?.backgroundColor === colors.primary;
    });
    const periodDayBand = findDescendant(periodDayPressable as { children?: unknown[] }, (candidate) => {
      const style = getNodeStyle(candidate);

      return candidate.type === "View" && style?.backgroundColor === colors.surfaceSoft;
    });

    const periodDayContent = findDescendant(periodDayPressable as { children?: unknown[] }, (candidate) => {
      const style = getNodeStyle(candidate);

      return candidate.type === "View" && style?.backgroundColor === colors.surface;
    });

    const periodDayBandStyle = StyleSheet.flatten(periodDayBand?.props?.style) as FlattenedStyle | undefined;
    const selectedDayContentStyle = StyleSheet.flatten(selectedDayContent?.props?.style) as FlattenedStyle | undefined;
    const periodDayContentStyle = StyleSheet.flatten(periodDayContent?.props?.style) as FlattenedStyle | undefined;

    expect(selectedDayContentStyle).toEqual(
      expect.objectContaining({
        backgroundColor: colors.primary,
      }),
    );

    expect(periodDayContentStyle).toEqual(
      expect.objectContaining({
        backgroundColor: colors.surface,
      }),
    );

    expect(periodDayBandStyle).toEqual(
      expect.objectContaining({
        overflow: "hidden",
      }),
    );
  });

  test("点击删除后以应用内弹窗显示确认且不调用原生 Alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    const getTextContent = (node: { children?: unknown[] | string | number | null }) => {
      const { children } = node;

      if (Array.isArray(children)) {
        return children
          .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
          .join("");
      }

      return children;
    };

    const findPressableAncestor = (node: ReactTestInstance) => {
      let current = node.parent;

      while (current) {
        if (typeof current.props?.onPress === "function") {
          return current;
        }

        current = current.parent;
      }

      return null;
    };

    const recordDay = renderer!.root.find(
      (node) =>
        node.type === "Text" &&
        getTextContent(node) === "4" &&
        (StyleSheet.flatten(node.props.style) as FlattenedStyle | undefined)
          ?.color === colors.rose,
    );

    await act(async () => {
      const onPress = findPressableAncestor(recordDay)?.props.onPress;

      if (typeof onPress === "function") {
        onPress();
      }
    });

    const deleteButtonText = renderer!.root.find(
      (node) => node.type === "Text" && getTextContent(node) === "删除",
    );

    await act(async () => {
      const onPress = findPressableAncestor(deleteButtonText)?.props.onPress;

      if (typeof onPress === "function") {
        onPress();
      }
    });

    const confirmModal = (renderer!.root as RendererRoot).findByType(Modal);

    expect(confirmModal.props.visible).toBe(true);
    expect(
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          getTextContent(node) === "确认删除这条经期记录吗？",
      ),
    ).toBeDefined();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test("记录成功刷新后清理旧删除确认", async () => {
    const mockedListPeriodRecords = jest.mocked(listPeriodRecords);
    mockedListPeriodRecords
      .mockResolvedValueOnce([
        {
          id: 1,
          startDate: "2026-05-04",
          endDate: "2026-05-09",
          createdAt: "2026-05-04T00:00:00.000Z",
          updatedAt: "2026-05-04T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          startDate: "2026-05-10",
          endDate: "2026-05-12",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z",
        },
      ]);

    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    const getTextContent = (node: { children?: unknown[] | string | number | null }) => {
      const { children } = node;

      if (Array.isArray(children)) {
        return children
          .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
          .join("");
      }

      return children;
    };

    const findPressableAncestor = (node: ReactTestInstance) => {
      let current = node.parent;

      while (current) {
        if (typeof current.props?.onPress === "function") {
          return current;
        }

        current = current.parent;
      }

      return null;
    };

    const recordDay = renderer!.root.find(
      (node) =>
        node.type === "Text" &&
        getTextContent(node) === "4" &&
        (StyleSheet.flatten(node.props.style) as FlattenedStyle | undefined)
          ?.color === colors.rose,
    );

    await act(async () => {
      const onPress = findPressableAncestor(recordDay)?.props.onPress;

      if (typeof onPress === "function") {
        onPress();
      }
    });

    const deleteButtonText = renderer!.root.find(
      (node) => node.type === "Text" && getTextContent(node) === "删除",
    );

    await act(async () => {
      const onPress = findPressableAncestor(deleteButtonText)?.props.onPress;

      if (typeof onPress === "function") {
        onPress();
      }
    });

    expect(
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          getTextContent(node) === "确认删除这条经期记录吗？",
      ),
    ).toBeDefined();

    await act(async () => {
      mockLatestFocusEffect?.();
    });

    expect(() =>
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          getTextContent(node) === "确认删除这条经期记录吗？",
      ),
    ).toThrow();
  });
});
