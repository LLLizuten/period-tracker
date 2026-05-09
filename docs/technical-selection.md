# 技术选型

## 目标

开发一个个人使用的本地经期记录 App，支持 Android 和 iOS 双端。

## 技术栈

- 应用框架：React Native + Expo
- 开发语言：TypeScript
- 路由：Expo Router
- 本地数据库：SQLite
- SQLite 访问方式：expo-sqlite

## 选型说明

### React Native + Expo

用于用一套代码开发 Android 和 iOS 双端 App。

Expo 负责简化开发、调试和构建流程，首版不直接维护原生 Android / iOS 工程。

### TypeScript

用于约束核心数据结构，减少记录、日期和预测逻辑中的低级错误。

### Expo Router

用于管理页面路由。

首版页面包括：

- 首页
- 日历页
- 设置页

### SQLite + expo-sqlite

SQLite 作为本地数据库，用于持久化保存经期记录。

expo-sqlite 作为 Expo 项目中访问 SQLite 的方式。

## 数据原则

- 数据只保存在本地设备。
- 不需要账号。
- 不上传数据。
- 不做云同步。
- 不调用远程服务。

## 首版不引入

- 账号系统
- 云同步
- 远程 API
- 推送提醒
- 复杂状态管理库
- 重型 UI 组件库
- 原生工程自定义配置
