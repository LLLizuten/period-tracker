import { act, create } from "react-test-renderer";
import { StyleSheet } from "react-native";

import HomeScreen from "../index";
import { colors } from "../../../src/theme";

type FlattenedStyle = {
  backgroundColor?: string;
  color?: string;
  overflow?: string;
};

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");

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

describe("HomeScreen", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 13, 12, 0, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
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
});
