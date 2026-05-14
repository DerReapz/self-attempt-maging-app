# Mage: The Ascension — Android App

Full-featured companion app for Mage: The Ascension (2nd Edition), built with React + Vite + Capacitor. Packages into an Android APK.

## Features

| Screen | Description |
|--------|-------------|
| **Characters** | Create, manage, and select multiple mage characters. Auto-saves to local storage. |
| **Character Sheet** | Full two-page interactive sheet — attributes, skills, spheres, health/willpower tracks, backgrounds, biography, and more. |
| **Sphere Reference** | Complete Nine Spheres reference with all five levels for each sphere (Correspondence, Entropy, Forces, Life, Matter, Mind, Prime, Spirit, Time). Expandable cards and overview table. |
| **Oracle** | AI-powered spell consultant — describe a magical effect and get sphere requirements, paradox assessment, combat stats, and environmental impact. |
| **Cassandra** | AI paradigm advisor — enter your mage's paradigm and desired effect to get a vivid narrative of how to perform it within your tradition. |

### Character Management
- Create unlimited characters
- Auto-saves all changes with 500ms debounce
- Export individual characters as `.mage` JSON files
- Import `.mage` / `.json` character files
- Export full character database to `mage_characters.json`
- Export character sheet as a print-ready HTML/PDF file

### Database
Characters are stored in the device's `localStorage` (backed by WebKit's SQLite on Android). Use **Export DB** to save a `mage_characters.json` file to the device's Documents folder — this is the "readily accessible database file."

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Java JDK | 17+ | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |

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
Then: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B — Command line
```bash
npm run apk
```

---

## Installing on device

1. Enable **Developer Options** → **USB Debugging**
2. Connect via USB:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   Or copy the APK to the device and open it (enable "Install unknown apps" first).

---

## Running as web app (no Android Studio needed)

```bash
npm run dev
```
Open http://localhost:5173

---

## Oracle & Cassandra — API key

The Oracle and Cassandra screens use the Anthropic Claude API. Enter your API key in the key field on each screen — it is stored only in local device storage and never transmitted anywhere except Anthropic's API endpoint.

---

## Project structure

```
src/
  main.jsx                 React entry point
  App.jsx                  Root with bottom navigation
  palette.js               Colour constants
  data/
    defaultSheet.js        Default character sheet structure
    spheres.js             Nine spheres reference content
  utils/
    storage.js             localStorage CRUD + JSON export
    pdfExport.js           Character sheet PDF / HTML export
  components/
    SharedUI.jsx           Track, DamageTrack, Dots, Divider, Field, etc.
  screens/
    CharacterList.jsx      Character roster
    CharacterSheet.jsx     Full interactive character sheet
    SphereReference.jsx    Nine spheres reference
    OracleScreen.jsx       AI spell consultant
    CassandraScreen.jsx    AI paradigm advisor
```

---

## Updating after code changes

```bash
npm run build
npx cap sync android
# Rebuild APK in Android Studio
```
