import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="settings" options={{ title: "设置" }} />
    </Tabs>
  );
}
