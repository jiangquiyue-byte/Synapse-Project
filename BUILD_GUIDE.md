# Synapse APK 构建指南

## 📋 前置要求

### 方案一：云端构建（推荐）
1. **Node.js** >= 18.x
2. **npm** >= 9.x
3. **Expo 账号**（免费注册：https://expo.dev）

### 方案二：本地构建
1. 以上所有要求
2. **Android Studio** + Android SDK
3. **Java JDK** 17+

---

## 🚀 快速开始

### 方案一：云端构建（最简单）

```bash
# 1. 进入项目目录
cd Synapse-Project/mobile

# 2. 安装依赖
npm install

# 3. 安装 EAS CLI
npm install -g eas-cli

# 4. 登录 Expo 账号
eas login

# 5. 构建 APK
eas build --platform android --profile production-apk

# 6. 等待构建完成（约 10-20 分钟）
# 构建完成后会提供下载链接
```

### 方案二：本地构建

```bash
# 1. 进入项目目录
cd Synapse-Project/mobile

# 2. 安装依赖
npm install

# 3. 安装 EAS CLI
npm install -g eas-cli

# 4. 登录 Expo 账号
eas login

# 5. 本地构建 APK
eas build --platform android --profile production-apk --local

# 6. 等待构建完成
# APK 文件会在当前目录生成
```

---

## 📦 构建配置说明

### eas.json 配置

```json
{
  "cli": {
    "version": ">= 18.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production-apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

### 构建配置说明

| 配置 | 说明 | 用途 |
|------|------|------|
| `development` | 开发版 APK | 开发调试 |
| `preview` | 预览版 APK | 内部测试 |
| `production-apk` | 生产版 APK | 正式发布 |

---

## 🔧 常见问题

### 1. 构建失败：权限错误
```bash
# 解决方案：使用 sudo
sudo npm install -g eas-cli
```

### 2. 构建失败：Expo 账号问题
```bash
# 解决方案：重新登录
eas logout
eas login
```

### 3. 构建失败：Android SDK 问题
```bash
# 解决方案：使用云端构建
eas build --platform android --profile production-apk
```

### 4. 构建失败：依赖问题
```bash
# 解决方案：清除缓存重新安装
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 📱 构建完成后

### 云端构建
1. 构建完成后，Expo 会提供一个下载链接
2. 点击链接下载 APK 文件
3. 将 APK 文件发送到微信

### 本地构建
1. 构建完成后，APK 文件会在当前目录
2. 文件名格式：`build-*.apk`
3. 将 APK 文件发送到微信

---

## 📤 发送到微信

### 方法一：直接发送
1. 打开微信
2. 选择联系人
3. 点击 "+" → 文件
4. 选择 APK 文件
5. 发送

### 方法二：使用微信文件传输助手
1. 打开微信
2. 搜索 "文件传输助手"
3. 点击 "+" → 文件
4. 选择 APK 文件
5. 发送

---

## 🔗 相关链接

- [Expo 官网](https://expo.dev)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [React Native 文档](https://reactnative.dev)

---

## 📞 技术支持

如果遇到问题，请检查：
1. Node.js 版本是否 >= 18.x
2. npm 版本是否 >= 9.x
3. Expo 账号是否正常
4. 网络连接是否正常

---

**最后更新：2026-05-30**
