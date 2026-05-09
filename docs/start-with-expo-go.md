# 使用 Expo Go 真机预览

本文档用于在本机启动经期记录 App，并用手机上的 Expo Go 查看真机效果。

## 前置要求

- 电脑已安装 Node.js 和 npm。
- 手机已安装 Google Play 当前版本的 Expo Go。
- 电脑和手机连接到同一个 Wi-Fi。
- 本项目使用 Expo SDK 54，适配 Google Play 当前 Expo Go 可打开的 SDK 版本。
- 项目依赖已经安装；如果没有安装，先在项目根目录运行：

```bash
npm install
```

## 启动服务

在项目根目录运行：

```bash
npm start
```

或直接运行：

```bash
npx expo start
```

命令启动后，终端会显示二维码和连接地址。

如果切换过 SDK 版本或手机端仍打开旧缓存，可以清理 Metro 缓存后重启：

```bash
npx expo start --clear
```

## 用 Expo Go 打开

1. 打开手机上的 Expo Go。
2. 使用 Expo Go 扫描终端里的二维码。
3. 等待 Metro Bundler 编译完成。
4. App 会在手机上打开。

## 网络模式

默认 `npm start` 会使用 Expo 的交互式启动方式。若手机无法连接，可以在终端中按 `?` 查看 Expo 命令帮助，再根据提示切换连接模式。

常见处理方式：

- 确认电脑和手机在同一个 Wi-Fi。
- 关闭 VPN 或代理后重试。
- 如果局域网访问受限，可以尝试在 Expo 启动界面切换为 tunnel 模式。

## 停止服务

在运行 Expo 服务的终端中按：

```bash
Ctrl + C
```

## 注意事项

- 本 App 使用 `expo-sqlite`，真机预览请优先使用 Expo Go。
- 本项目当前使用 Expo SDK 54；如果 Expo Go 提示 SDK 不兼容，请确认手机端 Expo Go 来自 Google Play 当前版本。
- 当前 Web 预览不是首要目标；Web 端可能受 `expo-sqlite` 的 wasm 资源解析影响。
- App 数据只保存在当前设备本地，卸载 App 或清空本地数据后记录会消失。
