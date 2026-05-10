import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
          title: "日历",
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "设置" }} />
    </Tabs>
  );
}
