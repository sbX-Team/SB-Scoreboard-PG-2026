// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from 'path'
import url from 'url'
import { app, Menu, dialog, ipcMain, shell, screen } from 'electron'
import { devMenuTemplate } from './menu/dev_menu_template'
import { editMenuTemplate } from './menu/edit_menu_template'
import createWindow from './helpers/window'
import { autoUpdater } from 'electron-updater'
const remoteMain = require('@electron/remote/main')

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from 'env'

var log = require('electron-log')
var fs = require('fs-extra')
var util = require('util')
var helpMenu
var updateWindow = null
var mainWindow = null
var settingsWindow = null
var photosettingsWindow = null
var shareappsettingsWindow = null
var boothsettingsWindow = null
var scoreboardWindow = null
// var updateWindow = null

autoUpdater.autoDownload = false

autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
autoUpdater.on('checking-for-update', function (_arg1) {
  return log.info('Checking for update...')
})
autoUpdater.on('update-available', function (_arg2) {
  return log.info('Update available.')
})
autoUpdater.on('update-not-available', function (_arg3) {
  return log.info('Update not available.')
})
autoUpdater.on('error', function (err) {
  return log.info('Error in auto-updater. ' + err)
})
autoUpdater.on('download-progress', function (progressObj) {
  log.info('downloading update')
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
  log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
  updateWindow.webContents.send('progress', progressObj.percent)
  console.log(log_message)
})
autoUpdater.on('update-downloaded', function (_arg4) {
  log.info('Update downloaded')
})
autoUpdater.on('update-available', () => {
  helpMenu = {
    label: 'Help',
    submenu: [
      { label: 'Updates Found - Download Update',
        click: function () {
          createUpdateWindow()
               // ipcRenderer.send('toggle-layouteditor-view')
          console.log('test')
            // createAdvancedSettingsWindow()
               // layoutWindow.show()
        }
      }
    ]
  }
  setApplicationMenu()
})

const setApplicationMenu = () => {
  const menus = [fileMenuTemplate]
  // menus.push(fileMenuTemplate);
  // if (env.name !== "production") {
  menus.push(devMenuTemplate)
  // }
  menus.push(helpMenu)
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus))
}

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
  const userDataPath = app.getPath('userData')
  app.setPath('userData', `${userDataPath} (${env.name})`)
}

app.on('ready', () => {
  remoteMain.initialize()
  autoUpdater.checkForUpdates()
  setApplicationMenu()
  // helpMenu = {
  //     label: 'Help',
  //     submenu: [
  //       { label: 'Updates Found - Download Update',
  //         click: function () {
  //           createUpdateWindow()
  //              // ipcRenderer.send('toggle-layouteditor-view')
  //           console.log('test')
  //           // createAdvancedSettingsWindow()
  //              // layoutWindow.show()
  //         }
  //       }
  //     ]
  //   }
  // setApplicationMenu();
  mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  })
  remoteMain.enable(mainWindow.webContents)

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'app.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  if (env.name === 'development') {
    mainWindow.openDevTools()
  }

  ipcMain.on('updateScore', function (event, data) {
    if (scoreboardWindow) {
      scoreboardWindow.webContents.send('updateScore', data)
    }
  })

  ipcMain.on('sbTakeoverStart', function (event, data) {
    if (scoreboardWindow) {
      scoreboardWindow.webContents.send('sbTakeoverStart', data)
    }
  })

  ipcMain.on('busHighScoreTrigger', function () {
    mainWindow.webContents.send('busHighScoreTrigger')
  })

  ipcMain.on('closeScoreboard', function () {
    if (scoreboardWindow) {
      scoreboardWindow.close()
    }
  })

  ipcMain.on('settingsUpdated', function (event, data) {
    mainWindow.webContents.send('settingsUpdated', data)
    if (scoreboardWindow) {
      scoreboardWindow.webContents.send('settingsUpdated', data)
    }
  })

  ipcMain.on('getInitialLeaderboard', function () {
    mainWindow.webContents.send('getInitialLeaderboard')
  })

  ipcMain.on('initialLeaderboard', function (event, data) {
    if (scoreboardWindow) {
      scoreboardWindow.webContents.send('initialLeaderboard', data)
    }
  })

  ipcMain.on('installupdate', function () {
    setImmediate(() => autoUpdater.quitAndInstall())
  })
  ipcMain.on('newFrameVersion', function (event, data) {
    // console.log(data)
    // console.log('New Share App Version received in background')
    if (boothsettingsWindow) {
      // console.log(data)
      boothsettingsWindow.webContents.send('newFrameVersionBackground', data)
    }
    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
  ipcMain.on('newPhotoBoothSettingsVersion', function (event, data) {
    // console.log(data)
    // console.log('New Share App Version received in background')
    if (boothsettingsWindow) {
      // console.log(data)
      boothsettingsWindow.webContents.send('newSettingsVersionBackground', data)
    }
    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
  ipcMain.on('newShareAppVersion', function (event, data) {
    // console.log(data)
    // console.log('New Share App Version received in background')
    if (shareappsettingsWindow) {
      // console.log(data)
      shareappsettingsWindow.webContents.send('newShareAppVersionBackground', data)
    }
    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
  ipcMain.on('updateShareAppID', function (event, data) {
    console.log('New Share App ID or and update happened')
    mainWindow.webContents.send('updateShareAppIDBackground', data)
    console.log(data)
    console.log('New Share App Version received in background' + data)

    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
  ipcMain.on('updatePhotoFrameID', function (event, data) {
    console.log('New Share Photo Frame update happened')
    mainWindow.webContents.send('updatePhotoFrameIDBackground', data)
    console.log(data)
    // console.log('New Share App Version received in background' + data)

    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
  ipcMain.on('updatephotoBoothSettingID', function (event, data) {
    console.log('New Photo Boot Settings update happened')
    mainWindow.webContents.send('updatephotoBoothSettingIDBackground', data)
    console.log(data)
    // console.log('New Share App Version received in background' + data)

    // ipcRenderer.send('newShareAppVersionBackground', data )
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

var fileMenuTemplate = {
  label: 'BOA Scoreboard',
  submenu: [
    {
 label: 'Scoreboard',
      click: function () {
        createScoreboardWindow()
      }
    },
    {
 label: 'Settings',
      click: function () {
        // ipcRenderer.send('toggle-layouteditor-view')
        console.log('test')
        createSettingsWindow()
        // layoutWindow.show()
      }
    },
    {
 label: 'Share App Settings',
      click: function () {
        // ipcRenderer.send('toggle-layouteditor-view')
        console.log('test')
        createShareAppSettingsWindow()
        // layoutWindow.show()
      }
    },
    {
 label: 'Booth Settings Sync',
      click: function () {
        // ipcRenderer.send('toggle-layouteditor-view')
        console.log('test')
        createBoothSettingsWindow()
        // layoutWindow.show()
      }
    },
    {
 label: 'Open Software Folder',
      click: function () {
        var folderPath = env.name === 'development'
          ? path.join(__dirname, '../extraResources')
          : path.join(__dirname, '../../extraResources')
        shell.openPath(folderPath)
      }
    },
    { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
    { type: 'separator' },
    { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
    { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
    { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
    { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
  ]
}
helpMenu = {
  label: 'Help',
  submenu: [
    {
 label: 'Check For Updates',
      click: function () {
        console.log('stupid')
        // ipcRenderer.send('toggle-layouteditor-view')
        // autoUpdater.checkForUpdates()
        // createAdvancedSettingsWindow()
        // layoutWindow.show()
        // createUpdateWindow()
      }
    }
  ]
}

function createScoreboardWindow () {
  if (scoreboardWindow === null) {
    scoreboardWindow = createWindow('scoreboard', {
      width: 1080,
      height: 1920,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    remoteMain.enable(scoreboardWindow.webContents)

    if (env.name !== 'development') {
      const primary = screen.getPrimaryDisplay()
      const secondDisplay = screen.getAllDisplays().find(function (d) { return d.id !== primary.id })
      if (secondDisplay) {
        scoreboardWindow.setBounds(secondDisplay.bounds)
        scoreboardWindow.setFullScreen(true)
      }
    }

    scoreboardWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'scoreboard.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    scoreboardWindow.on('closed', function () {
      scoreboardWindow = null
    })
    if (env.name === 'development') {
      scoreboardWindow.openDevTools()
    }
  }
}

function createUpdateWindow () {
  if (updateWindow === null) {
    autoUpdater.downloadUpdate()
    updateWindow = createWindow('maintest', {
      width: 1000,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    remoteMain.enable(updateWindow.webContents)

    updateWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'update.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    // updateWindow.openDevTools();
    updateWindow.on('closed', function () {
      updateWindow = null
    })
  }
}

function createSettingsWindow () {
  if (settingsWindow === null) {
    settingsWindow = createWindow('maintest', {
      width: 800,
      height: 800,
      setAlwaysOnTop: true,
      parent: mainWindow,
      modal: true,
      show: true,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    remoteMain.enable(settingsWindow.webContents)

    settingsWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'settings.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    // settingsWindow.openDevTools();
    settingsWindow.on('closed', function () {
      settingsWindow = null
    })
  }
  settingsWindow.openDevTools()
}

function createPhotoSettingsWindow () {
  if (settingsWindow === null) {
    photosettingsWindow = createWindow('maintest', {
      width: 800,
      height: 800,
      parent: mainWindow,
      show: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    remoteMain.enable(photosettingsWindow.webContents)

    photosettingsWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'photosettings.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    // settingsWindow.openDevTools();
    photosettingsWindow.on('closed', function () {
      photosettingsWindow = null
    })
  }
  photosettingsWindow.openDevTools()
}

function createShareAppSettingsWindow () {
  if (shareappsettingsWindow === null) {
    shareappsettingsWindow = createWindow('maintest', {
      width: 800,
      height: 800,
      parent: mainWindow,
      show: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }

    })
    remoteMain.enable(shareappsettingsWindow.webContents)

    shareappsettingsWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'shareappsettings.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    // settingsWindow.openDevTools();
    shareappsettingsWindow.on('closed', function () {
      shareappsettingsWindow = null
    })
  }
  shareappsettingsWindow.openDevTools()
}

function createBoothSettingsWindow () {
  if (boothsettingsWindow === null) {
    boothsettingsWindow = createWindow('maintest', {
      width: 800,
      height: 800,
      parent: mainWindow,
      show: true,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }

    })
    remoteMain.enable(boothsettingsWindow.webContents)

    boothsettingsWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'boothsettings.html'),
        protocol: 'file:',
        slashes: true
      })
    )
    // settingsWindow.openDevTools();
    boothsettingsWindow.on('closed', function () {
      boothsettingsWindow = null
    })
  }
  boothsettingsWindow.openDevTools()
}

log.transports.console = function (msg) {
  var text = util.format.apply(util, msg.data)
  console.log(`[${msg.date} ${msg.level}] ${text}`)
  if (mainWindow) {
    mainWindow.webContents.send('log', `[${msg.date.toLocaleTimeString()} ${msg.level}] ${text}`)
  }
}
log.transports.file.file = 'c:/SB-Scoreboard/logs/app.log'
