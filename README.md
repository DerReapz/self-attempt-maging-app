# Mage: The Ascension — Character Sheet App

Interactive character sheet for Mage: The Ascension (5th Edition), built with React + Capacitor.  
Runs as a web app and can be packaged into an Android APK.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Java JDK | 17+ | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |

Android Studio installs the Android SDK automatically. After install, open it once and let it finish setup.

---

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Add the Android platform (first time only)
npx cap add android

# 3. Build the web app and sync to Android
npm run build
npx cap sync android
```

---

## Building the APK

### Option A — Android Studio (recommended)
```bash
npx cap open android
```
Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**  
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B — Command line (requires SDK + Gradle in PATH)
```bash
npm run apk
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Installing on device

1. Enable **Developer Options** on your Android device  
   (Settings → About Phone → tap Build Number 7 times)
2. Enable **USB Debugging** in Developer Options
3. Connect via USB and run:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   Or just copy the APK to the device and open it (enable "Install unknown apps" in Settings).

---

## Running as a web app (no Android Studio needed)

```bash
npm run dev
```
Open http://localhost:5173 in any browser.

---

## Save / Load system

| Feature | How it works |
|---------|-------------|
| **Auto-save** | All changes save automatically to the app's local storage (600ms debounce). No manual save needed. |
| **Export .mage** | Tap the **↓ Export** button on any sheet. Saves a JSON file with `.mage` extension. On Android, saved to `Documents/MageSheets/`. |
| **Import .mage** | On the character list screen, tap **↑ Import .mage File** and pick a `.mage` or `.json` file. |
| **Multiple characters** | The home screen lists all saved characters sorted by last modified. |

`.mage` files are plain JSON — you can back them up, share them, or edit them in any text editor.

---

## Project structure

```
mage-app/
├── src/
│   ├── App.jsx           Screen router (list ↔ sheet)
│   ├── CharacterList.jsx Home screen with character library
│   ├── MageSheet.jsx     The full interactive character sheet
│   ├── storage.js        localStorage + file I/O abstraction
│   ├── main.jsx          React entry point
│   └── index.css         Global styles
├── index.html
├── vite.config.js
├── capacitor.config.json
└── package.json
```

---

## Updating after code changes

```bash
npm run build
npx cap sync android
# Then rebuild APK in Android Studio
```
