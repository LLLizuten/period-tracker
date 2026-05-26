# APK 构建指南

本文档用于将 Period Tracker 打包为 APK 安装包。

## 前置要求

- 电脑已安装 Node.js 和 npm
- 项目依赖已安装（`npm install`）
- 已注册 [Expo 账号](https://expo.dev)（免费）

## 一次性配置（仅首次需要）

### 1. 安装 EAS CLI

```bash
npm install -g eas-cli
```

### 2. 登录 Expo

```bash
eas login
```

按提示输入 Expo 账号和密码。

### 3. 初始化 EAS

```bash
eas build:configure
```

- 选择平台时选 **Android**
- 确认生成 `eas.json`

### 4. 配置 APK 输出

打开 `eas.json`，修改为：

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

> 默认输出格式是 AAB（Google Play 用），加上 `buildType: apk` 才会生成可直接安装的 APK 文件。

## 构建

```bash
eas build --platform android --profile preview
```

- 构建在 Expo 云端进行，无需本地安装 Android Studio
- 通常几分钟内完成
- 构建完成后终端会显示 APK 下载链接

## 安装

1. 打开 APK 下载链接，下载到手机
2. 首次安装需要允许"安装未知来源应用"
3. 安装完成即可使用

## 注意事项

- 免费账号每月有构建次数限制，足够个人使用
- 每次构建会自动递增版本号（versionCode），无需手动管理
- 构建过程中不要关闭终端，可以在终端看到实时进度
