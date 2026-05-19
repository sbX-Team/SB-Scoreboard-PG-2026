const remote = require('@electron/remote');
const {ipcRenderer} = require('electron');
const storage = require('electron-json-storage');
storage.setDataPath('c:/SB-Scoreboard');
// Copy and paste commands
const inputMenu = require('electron-input-menu');
const context = require('electron-contextmenu-middleware')


context.use(inputMenu);
context.activate();

// Pull the settings or create them if they have not been created yet

$(function () {
  storage.get('settings', function (error, settings) {
    if (error) throw error;
    $('#resetDelay').val(settings.resetDelay || 5000);
    $('#animationDuration').val(settings.animationDuration || 3000);
    $('#animationResetDuration').val(settings.animationResetDuration || 1000);
    $('#newScoreDisplayTime').val(settings.newScoreDisplayTime || 5000);
    $('#cycleInterval').val(settings.cycleInterval || 6000);
    $('#sbTakeoverTimes').val(settings.sbTakeoverTimes || '');
    $('#sbTakeoverDuration').val(settings.sbTakeoverDuration || 30);
    $('#busTakeoverTimes').val(settings.busTakeoverTimes || '');
    $('#busTakeoverMode').val(settings.busTakeoverMode || 'timer');
    $('#busHighScoreCooldown').val(settings.busHighScoreCooldown || 60);
    $('#busRelaySerialNumber').val(settings.busRelaySerialNumber || '');
    $('#busRelay1Delay').val(settings.busRelay1Delay || 0);
    $('#busRelay1OnTime').val(settings.busRelay1OnTime || 1000);
    $('#busRelay2Delay').val(settings.busRelay2Delay || 0);
    $('#busRelay2OnTime').val(settings.busRelay2OnTime || 1000);
    $('#busMp3Delay').val(settings.busMp3Delay || 0);
    $('#dmxPort').val(settings.dmxPort || '');
    $('#dmxChannel').val(settings.dmxChannel || 1);
    $('#dmxCannonOnValue').val(settings.dmxCannonOnValue !== undefined ? settings.dmxCannonOnValue : 255);
    $('#dmxCannonOffValue').val(settings.dmxCannonOffValue !== undefined ? settings.dmxCannonOffValue : 0);

    console.log(settings);
  });

  $('#cancelsettings').click(function () {
    var window = remote.getCurrentWindow();
    window.close();
  });

  $('#savesettings').click(function () {
    console.log('save settings');
    var config = {};
    $('#settingsform').serializeArray().map(function (item) {
      console.log(item)
      if (config[item.name]) {
        if (typeof (config[item.name]) === 'string') {
          config[item.name] = [config[item.name]];
        }
        config[item.name].push(item.value);
      } else {
        config[item.name] = item.value;
      }
    });
    console.log(config);
    storage.set('settings', config, function (error) {
      console.log(error);
      ipcRenderer.send('settingsUpdated', config);
      var window = remote.getCurrentWindow();
      window.close();
    });
  });
});
