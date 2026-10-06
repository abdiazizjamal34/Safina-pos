# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# ─── Rebuild POS ───────────────────────────
cd D:\Safina-pos\frontend
npm run build:pos
cd android-pos
.\gradlew --stop
.\gradlew assembleRelease
Copy-Item app\build\outputs\apk\release\app-release.apk ..\Safina-POS-v1.1.apk
cd ..

# ─── Rebuild Waiter ────────────────────────
npm run build:waiter
cd android-waiter
.\gradlew assembleRelease
Copy-Item app\build\outputs\apk\release\app-release.apk ..\Safina-waiter-v1.1.apk
cd ..

# ─── Result ────────────────────────────────
# D:\Safina-pos\frontend\Safina-POS-v1.1.apk
# D:\Safina-pos\frontend\Safina-waiter-v1.1.apk