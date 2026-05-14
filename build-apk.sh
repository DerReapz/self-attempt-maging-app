#!/bin/bash
# Builds the Android APK file.
# Requirements: Node.js, Java JDK 17+, Android Studio installed.
# Usage: bash build-apk.sh

set -e

echo ""
echo "Step 1/4 — Installing packages..."
npm install

echo ""
echo "Step 2/4 — Building the web app..."
npm run build

echo ""
echo "Step 3/4 — Setting up Android project (first run only)..."
npx cap add android 2>/dev/null || true
npx cap sync android

echo ""
echo "Step 4/4 — Building the APK..."
cd android && ./gradlew assembleDebug
cd ..

echo ""
echo "===================================="
echo "APK ready:"
echo "  android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Copy that file to your phone and open it to install."
echo "===================================="
echo ""
