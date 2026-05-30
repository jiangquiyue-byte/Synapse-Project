#!/bin/bash
# Synapse APK 构建脚本
# 使用方法: bash build-apk.sh

set -e

echo "🚀 开始构建 Synapse APK..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 请先安装 npm"
    exit 1
fi

# 进入 mobile 目录
cd "$(dirname "$0")/mobile"

echo "📦 安装依赖..."
npm install

echo ""
echo "🔧 安装 EAS CLI..."
npm install -g eas-cli

echo ""
echo "🔑 登录 Expo 账号（如果没有账号会提示注册）..."
eas login

echo ""
echo "📱 开始构建 APK..."
echo "选择构建方式："
echo "1. 云端构建（推荐，无需本地 Android SDK）"
echo "2. 本地构建（需要 Android SDK）"
read -p "请选择 (1/2): " choice

if [ "$choice" = "2" ]; then
    echo ""
    echo "🔨 本地构建..."
    eas build --platform android --profile production-apk --local
else
    echo ""
    echo "☁️ 云端构建..."
    eas build --platform android --profile production-apk
fi

echo ""
echo "✅ 构建完成！"
echo "📱 APK 文件位置: ./build-*.apk"
echo ""
echo "📤 发送到微信..."
# 这里可以添加发送到微信的逻辑
