# Electron Upgrade Guide

Reference project for modern patterns: `C:\Projects\ReactionGame` (Electron 33.2.1)

---

## Overview of Changes

Upgrading from Electron 8 → 33 requires changes in five areas:
1. Package versions
2. Build tooling (Webpack 3 → 5, Babel)
3. Electron `remote` module migration
4. `BrowserWindow` security options
5. Release/build config

---

## 1. package.json

### Dependencies to add
```json
"@electron/remote": "^2.1.2"
```

### Dependencies to update
| Package | Old | New |
|---|---|---|
| `electron-updater` | ^2.21.8 | ^6.3.4 |
| `electron-json-storage` | ^4.1.5 | ^4.6.0 |
| `socket.io` | ^2.3.0 | ^4.5.4 |
| `sharp` | ^0.25.2 | ^0.33.0 |

### Dependencies to remove
- `electron-publisher-s3` — S3 support is built into electron-builder 24+

### devDependencies to update
| Package | Old | New |
|---|---|---|
| `electron` | 8.1.1 | 33.2.1 |
| `electron-builder` | ^19.43.3 | ^24.13.3 |
| `webpack` | ^3.8.1 | ^5.91.0 |
| `webpack-merge` | ^4.1.0 | ^5.10.0 |
| `webpack-node-externals` | ^1.6.0 | ^3.0.0 |
| `@babel/core` | ^7.0.0-beta.5 | ^7.24.0 |
| `@babel/preset-env` | ^7.0.0-beta.5 | ^7.24.0 |
| `babel-loader` | ^8.0.0-beta.0 | ^9.1.3 |
| `css-loader` | ^0.28.7 | ^6.10.0 |
| `style-loader` | ^0.19.0 | ^3.3.4 |
| `mocha` | ^4.0.1 | ^10.4.0 |
| `electron-mocha` | ^5.0.0 | ^12.0.0 |
| `chai` | ^4.1.0 | ^4.4.1 |
| `source-map-support` | ^0.5.0 | ^0.5.21 |

### devDependencies to add
```json
"webpack-cli": "^5.1.4",
"patch-package": "^8.0.1"
```

### devDependencies to remove
- `friendly-errors-webpack-plugin` — not compatible with webpack 5
- `babel-plugin-transform-object-rest-spread` — built into @babel/preset-env now
- `spectron` — deprecated (no maintained replacement needed)

### Add overrides section (fixes native module ABI issues)
```json
"overrides": {
  "nan": "^2.22.0",
  "node-abi": "^4.27.0"
}
```

### Scripts changes
- `--display=none` → `--stats=none` (webpack 5 CLI flag rename)
- `postinstall`: prepend `patch-package &&`
- `test`: change from `npm run e2e` to `npm run unit` (Spectron/e2e no longer works with modern Electron)

### Build config additions
```json
"build": {
  "win": {
    "signAndEditExecutable": false
  },
  "publish": {
    "region": "us-east-1"
  }
}
```

---

## 2. .babelrc

```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "electron": "33" } }]
  ]
}
```

Key changes:
- `@babel/env` → `@babel/preset-env`
- Targets changed from `browsers/node` to specific `electron` version
- Remove `transform-object-rest-spread` plugin (now included in preset-env)

---

## 3. Webpack configs

### webpack.base.config.js

Three changes:
1. **Remove** `friendly-errors-webpack-plugin` (import and usage)
2. **Change target** from `"node"` to `"electron-renderer"`
3. **Fix env handling** — webpack 5 passes `env` as an object, not a string:
   ```js
   const envName = typeof env === 'string'
     ? env
     : (Object.keys(env).find(k => !k.startsWith('WEBPACK_')) || 'development');
   // use envName instead of env in resolve.alias
   ```
4. **Replace url-loader** with webpack 5 built-in asset modules:
   ```js
   // Old (webpack 3):
   { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
   // New (webpack 5):
   { test: /\.(png|woff|woff2|eot|ttf|svg)$/, type: 'asset/inline', parser: { dataUrlCondition: { maxSize: 100000 } } }
   ```

### webpack.app.config.js / webpack.unit.config.js / webpack.e2e.config.js

webpack-merge 5 changed to named export:
```js
// Old:
const merge = require('webpack-merge')
// New:
const { merge } = require('webpack-merge')
```

### build/start.js

Add proper error handling:
```js
const watching = compiler.watch({}, (err, stats) => {
  if (err) { console.error(err); return; }
  if (stats.hasErrors()) {
    console.error(stats.toString({ colors: true, errors: true, warnings: false }));
    return;
  }
  // ... spawn electron
});
```

---

## 4. `remote` module migration

`electron.remote` was removed in Electron 14. Replace with `@electron/remote`.

### In background.js (main process)
```js
// Add import at top
const remoteMain = require('@electron/remote/main')

// Add as FIRST line in app.on('ready')
app.on('ready', () => {
  remoteMain.initialize()
  // ...

  // After EACH createWindow() call, enable remote for that window:
  mainWindow = createWindow(...)
  remoteMain.enable(mainWindow.webContents)
})
```

Do this for every window created: main, update, settings, shareapp settings, booth settings, etc.

### In renderer files (app.js, settings.js, update.js, helpers/context_menu.js, etc.)
```js
// Old:
import { remote } from 'electron'
const { remote } = require('electron')

// New:
const remote = require('@electron/remote')
```

---

## 5. BrowserWindow security options

Modern Electron requires explicit opt-in for legacy security model. Add `contextIsolation: false` alongside `nodeIntegration: true` in ALL `webPreferences`:

```js
// Old:
webPreferences: { nodeIntegration: true }

// New:
webPreferences: { nodeIntegration: true, contextIsolation: false }
```

This applies to every `createWindow()` call in background.js.

---

## 6. electron-json-storage: must explicitly set data path

**Symptom:** `Uncaught Error: You must explicitly set a data path`

**Cause:** `electron-json-storage` 4.6+ can no longer auto-resolve the Electron app data path from a renderer process. You must call `setDataPath` before any `get`/`set`/`getMany` calls.

**Fix:** In every file that requires `electron-json-storage`, add `setDataPath` immediately after the require:
```js
const storage = require('electron-json-storage')
storage.setDataPath('c:/SB-Scoreboard')  // use the app's data directory
```

This must be done in **every** file that imports the package (e.g. `app.js`, `settings.js`).

---

## 7. Log transport null crash on startup

**Symptom:** `TypeError: Cannot read properties of null (reading 'webContents')` in main process on launch.

**Cause:** `log.transports.console` fires during `autoUpdater.checkForUpdates()`, which runs before `mainWindow` is created. If the transport directly calls `mainWindow.webContents.send(...)`, it crashes.

**Fix:** Add a null guard:
```js
log.transports.console = function (msg) {
  var text = util.format.apply(util, msg.data)
  console.log(`[${msg.date} ${msg.level}] ${text}`)
  if (mainWindow) {
    mainWindow.webContents.send('log', `[${msg.date.toLocaleTimeString()} ${msg.level}] ${text}`)
  }
}
```

---

## 7. Strict mode breaking changes

New Babel/webpack 5 enforces ES module strict mode. Pre-existing code bugs that older Babel silently allowed will now throw errors. Common one encountered:

**Duplicate function declarations** — JavaScript strict mode disallows two `function` declarations with the same name in the same scope. Old Babel beta was lenient about this.

```
SyntaxError: Identifier 'incNbr' has already been declared.
```

Search the entire `src/` tree for duplicated function names if you see these errors. The fix is simply to delete the duplicate.

---

## 7. Notes on specific packages

- **sharp**: Must upgrade to ^0.33.0 for Node 20 compatibility (Electron 33 uses Node 20). Verify that any sharp API calls still work — the core resize/convert API is stable but some options changed.
- **socket.io**: Upgrading from v2 to v4 is safe when both server and client are in the same Electron app (served client JS updates automatically). External clients connecting to v2 server will break.
- **electron-contextmenu-middleware / electron-input-menu**: These older packages may have issues with modern Electron. Monitor after upgrade.
- **nedb**: Pure JS, no native rebuild needed.
- **fluent-ffmpeg**: Pure JS wrapper, no native rebuild needed.
- **bufferutil / utf-8-validate**: Native modules, will be rebuilt by `electron-builder install-app-deps`.

---

## 8. Important project-specific notes

- **Keep all app processing in app.js** — The Express server, socket.io, and all application logic must remain in `src/app.js` (renderer process). Do NOT move to `src/background.js` (main process).

---

## 9. Upgrade checklist

- [x] Update package.json (versions, scripts, overrides, build config)
- [x] Update .babelrc
- [x] Update build/webpack.base.config.js
- [x] Update build/webpack.app.config.js (destructure merge)
- [x] Update build/webpack.unit.config.js (destructure merge)
- [x] Update build/webpack.e2e.config.js (destructure merge)
- [x] Update build/start.js (error handling)
- [x] Update src/background.js (remoteMain, contextIsolation)
- [x] Update all renderer files using `remote` → `@electron/remote`
- [x] Fix duplicate function declarations in src/scoreboard.js (strict mode)
- [x] Delete node_modules and package-lock.json
- [x] Run `npm install` — succeeded, bufferutil + utf-8-validate rebuilt for Electron 33
- [x] `npm run unit` — 4 tests passing
- [x] `electron-builder --dir` — BMW Scoreboard.exe built to dist/win-unpacked/
- [x] Fix null crash: `log.transports.console` must guard `if (mainWindow)` before calling webContents.send
- [x] Fix electron-json-storage: add `storage.setDataPath('c:/SB-Scoreboard')` in every file that uses it
- [ ] Run `npm start` to verify dev/hot-reload works
- [ ] Run `npm run release` to do a full publish build (requires AWS credentials)
