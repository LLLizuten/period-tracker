import React from "react";

import TabsLayout from "../_layout";
import { colors } from "../../../src/theme";

const { act, create } = require("react-test-renderer") as {
  act: (callback: () => void) => void;
  create: (element: React.ReactElement) => unknown;
};

const mockTabs = jest.fn();
const mockTabsScreen = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");

  const Tabs: any = jest.fn(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      mockTabs(props);
      return React.createElement(React.Fragment, null, children);
    },
  );

  Tabs.Screen = jest.fn((props: Record<string, unknown>) => {
    mockTabsScreen(props);
    return null;
  });

  return { Tabs };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("TabsLayout", () => {
  beforeEach(() => {
    mockTabs.mockClear();
    mockTabsScreen.mockClear();
  });

  it("统一配置底部 Tabs 样式、图标并关闭顶部页头", () => {
    act(() => {
      create(<TabsLayout />);
    });

    expect(mockTabs).toHaveBeenCalledTimes(1);
    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: expect.objectContaining({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: expect.objectContaining({
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          }),
        }),
      }),
    );

    expect(mockTabsScreen).toHaveBeenCalledTimes(2);
    expect(mockTabsScreen).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "index",
        options: expect.objectContaining({
          title: "首页",
          tabBarIcon: expect.any(Function),
        }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: "settings",
        options: expect.objectContaining({
          title: "设置",
          tabBarIcon: expect.any(Function),
        }),
      }),
    );

    const homeOptions = mockTabsScreen.mock.calls[0][0].options as {
      tabBarIcon: (props: { color: string; size: number; focused: boolean }) => React.ReactNode;
    };
    const settingsOptions = mockTabsScreen.mock.calls[1][0].options as {
      tabBarIcon: (props: { color: string; size: number; focused: boolean }) => React.ReactNode;
    };

    const homeActiveIcon = homeOptions.tabBarIcon({
      color: colors.primary,
      size: 22,
      focused: true,
    }) as React.ReactElement;
    const homeInactiveIcon = homeOptions.tabBarIcon({
      color: colors.textSubtle,
      size: 22,
      focused: false,
    }) as React.ReactElement;
    const settingsActiveIcon = settingsOptions.tabBarIcon({
      color: colors.primary,
      size: 22,
      focused: true,
    }) as React.ReactElement;
    const settingsInactiveIcon = settingsOptions.tabBarIcon({
      color: colors.textSubtle,
      size: 22,
      focused: false,
    }) as React.ReactElement;

    expect(homeActiveIcon.props).toEqual(
      expect.objectContaining({
        name: "home",
        color: colors.primary,
        size: 22,
      }),
    );
    expect(homeInactiveIcon.props).toEqual(
      expect.objectContaining({
        name: "home-outline",
        color: colors.textSubtle,
        size: 22,
      }),
    );
    expect(settingsActiveIcon.props).toEqual(
      expect.objectContaining({
        name: "settings",
        color: colors.primary,
        size: 22,
      }),
    );
    expect(settingsInactiveIcon.props).toEqual(
      expect.objectContaining({
        name: "settings-outline",
        color: colors.textSubtle,
        size: 22,
      }),
    );
  });
});
