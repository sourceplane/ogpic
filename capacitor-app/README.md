# Rondo Android APK (Capacitor)

Builds an Android APK that wraps the **live** Rondo web app in a native
[Capacitor](https://capacitorjs.com/) WebView. Unlike the TWA approach there is
**no browser address bar** — it looks and feels like a normal app.

The UI is loaded **online from production** (`server.url` in
`capacitor.config.json`), so nothing is bundled and the app always shows the
currently-deployed UI:

- Loads: `https://ogpic-web-console-next-prod.rahulvarghesepullely.workers.dev/rondo`

## Get the APK (no local setup)

Built by GitHub Actions and attached to a GitHub Release.

1. **Actions → "Android APK (Capacitor)" → Run workflow** → pick a **variant**
   (or push an `apk-*` tag, which builds prod):
   - **prod** → production URL, real email login → Release **`android-latest`**
   - **dev** → stage URL, where the backend runs in `local_debug` so the login
     screen shows the **DEV CODE** (no real email needed); a separate app id
     (`ai.sourceplane.rondo.dev`, "Rondo Dev") lets it install alongside prod →
     Release **`android-dev`**
2. Download `rondo.apk` from the matching Release (or the run's build artifact).
3. On your phone: open the APK, allow "install unknown apps", install.

## Notes

- Ships as a **debug-signed** APK so it sideloads with no signing setup. It is
  for testing, not Play Store distribution.
- The native project (`android/`) and `node_modules/` are generated at build
  time and are not committed. `capacitor.config.json`, `www/` (offline
  fallback), and `resources/icon.png` (launcher icon source) are the inputs.

## Build locally (optional)

Requires Node 20, JDK 17, and the Android SDK.

```bash
cd capacitor-app
npm install
npx cap add android
npx capacitor-assets generate --android   # optional: branded icon
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```
