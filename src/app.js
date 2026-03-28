/* global $ */
// import "./stylesheets/main.css";
// Small helpers you might want to keep
import './helpers/context_menu.js'
import './helpers/external_links.js'

// ----------------------------------------------------------------------------
// Everything below is just to show you how it works. You can delete all of it.
// ----------------------------------------------------------------------------

const remote = require('@electron/remote')
import jetpack from 'fs-jetpack'
const { ipcRenderer } = require('electron')
var shell = require('electron').shell
var fs = require('fs-extra')
var path = require('path')
const request = require('request')
const { exec } = require('child_process')
const log = require('electron-log')
// var s3 = require('s3')
var moment = require('moment')
const storage = require('electron-json-storage')
storage.setDataPath('c:/SB-Scoreboard')
const app = remote.app
const appDir = jetpack.cwd(app.getAppPath())
var async = require('async')
var faker = require('faker')
const server = require('./express')
var os = require('os')
var _ = require('underscore')
let scoreboardSettings = {
  resetDelay: 5000,
  animationDuration: 3000,
  animationResetDuration: 1000
}

let sbTakeoverTimes = []
let sbTakeoverDuration = 30
let sbLastTakeoverKey = ''

let busTakeoverTimes = []
let busRelaySerialNumber = ''
let busRelay1Delay = 0
let busRelay1OnTime = 1000
let busRelay2Delay = 0
let busRelay2OnTime = 1000
let busMp3Delay = 0
let busLastTakeoverKey = ''
let busAudio = null
let busAudioVolume = 1
let busTakeoverMode = 'timer'     // 'timer' | 'highscore'
let busHighScoreCooldown = 60     // seconds
let busLastHighScoreTrigger = 0   // Date.now() ms timestamp

function parseSbTakeoverTimes (str) {
  if (!str) return []
  return str.split(',').map(function (s) {
    var m = parseInt(s.trim())
    return (!isNaN(m) && m >= 0 && m <= 59) ? m : null
  }).filter(function (v) { return v !== null })
}

function parseBusTakeoverTimes (str) {
  if (!str) return []
  return str.split(',').map(function (s) {
    var m = parseInt(s.trim())
    return (!isNaN(m) && m >= 0 && m <= 59) ? m : null
  }).filter(function (v) { return v !== null })
}

function getBusRelayExePath () {
  return isDevMode
    ? path.join(__dirname, '../extraResources/CommandApp_USBRelay.exe')
    : path.join(__dirname, '../../extraResources/CommandApp_USBRelay.exe')
}

function relayOn (channel) {
  var serial = busRelaySerialNumber.trim()
  if (!serial) { log.info('Bus relay: no serial number configured'); return }
  exec('"' + getBusRelayExePath() + '" ' + serial + ' open ' + channel, function (err) {
    if (err) log.info('Bus relay ON error (ch ' + channel + '): ' + err.message)
    else log.info('Bus relay ON ch ' + channel)
  })
}

function relayOff (channel) {
  var serial = busRelaySerialNumber.trim()
  if (!serial) { log.info('Bus relay: no serial number configured'); return }
  exec('"' + getBusRelayExePath() + '" ' + serial + ' close ' + channel, function (err) {
    if (err) log.info('Bus relay OFF error (ch ' + channel + '): ' + err.message)
    else log.info('Bus relay OFF ch ' + channel)
  })
}

function runBusTakeover () {
  log.info('Bus Take Over starting')
  setTimeout(function () {
    relayOn('01')
    setTimeout(function () { relayOff('01') }, busRelay1OnTime)
  }, busRelay1Delay)
  setTimeout(function () {
    relayOn('02')
    setTimeout(function () { relayOff('02') }, busRelay2OnTime)
  }, busRelay2Delay)
  setTimeout(function () {
    if (busAudio) { busAudio.pause(); busAudio = null }
    busAudio = new Audio('file:///C:/SB-Scoreboard/busstakeover.mp3')
    busAudio.volume = busAudioVolume
    busAudio.play().catch(function (err) { log.info('Bus audio error: ' + err.message) })
  }, busMp3Delay)
}

function updateLeaderboardCounts () {
  db.count({ score: { $exists: true }, deleted: 0 }, function (err, count) {
    if (!err) {
      $('#leaderboardTotalDisplay').text(count)
    }
  })
}

function updateSbTakeoverDisplay () {
  $('#sbTakeoverTimesDisplay').text(sbTakeoverTimes.length ? sbTakeoverTimes.join(', ') : '—')
  $('#sbTakeoverDurationDisplay').text(sbTakeoverDuration)
}

function updateBusTakeoverDisplay () {
  $('#busTakeoverTimesDisplay').text(busTakeoverTimes.length ? busTakeoverTimes.join(', ') : '—')
  $('#busRelaySerialDisplay').text(busRelaySerialNumber || '—')
  $('#busTakeoverModeDisplay').text(busTakeoverMode === 'highscore' ? 'New High Score' : 'Timer')
  $('#busVolumeSlider').val(busAudioVolume)
  $('#busVolumeDisplay').text(Math.round(busAudioVolume * 100) + '%')
}

var Datastore = require('nedb')
var db = new Datastore({ filename: '/SB-Scoreboard/scoreboard.db', autoload: true })
var ifaces = os.networkInterfaces()

document.title = appDir.read('package.json', 'json').productName + ' - ' + appDir.read('package.json', 'json').version
const isDevMode = process.execPath.match(/dist[\\/]electron/i)


var client

var ip

// Detects the IP of this machine.
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0

  ifaces[ifname].forEach(function (iface) {
    if (iface.family !== 'IPv4' || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      $('#ipaddresses').append(ifname + ': <a href="http://' + iface.address + ':5000">' + iface.address + '<br/>')
      console.log(ifname + ':' + alias, iface.address)

      ip = iface.address
    } else {
      // this interface has only one ipv4 adress
      $('#ipaddresses').append(ifname + ': <a href="http://' + iface.address + ':5000">http://' + iface.address + ':5000<br/>')
      // $('#ipaddresses').append('<b>' + ifname + '</b>:' + iface.address + ':3000<br/>')
      console.log(ifname, iface.address)
      ip = iface.address
    }
    ++alias
  })
})

$(document).on('click', 'a[href^="http"]', function (event) {
  event.preventDefault()
  shell.openExternal(this.href)
})

//  Express Server Views - Here because its easier to pass settings

server.app.locals.someHelper = function (name) {
  if (name > 3 && name < 21) return 'th'
  switch (name % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
  // return ("hello " + name);
}

server.app.locals.momentFormat = function (date) {
  return moment(date).format('MMMM Do YYYY')
  // return ("hello " + name);
}

server.app.get('/scoreboard', function (_req, res) {
  db.find({ score: { $exists: true }, deleted: 0 }).sort({ score: -1 }).limit(50).exec(function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      console.log(docs)
      res.render('scoreboard', {
        title: 'Settings',
        subtitle: '',
        ip: ip + ':3000',
        scoreboard: docs,
        resetDelay: scoreboardSettings.resetDelay,
        animationDuration: scoreboardSettings.animationDuration,
        animationResetDuration: scoreboardSettings.animationResetDuration
      })
    }
  })
})
server.app.get('/guagetest', function (_req, res) {
  db.find({ score: { $exists: true }, deleted: 0 }).sort({ score: -1 }).limit(50).exec(function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      console.log(docs)
      res.render('guage', { title: 'Settings', subtitle: '', ip: ip + ':3000', scoreboard: docs })
    }
  })
})
server.app.get('/', function (_req, res) {
  res.render('home', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})
server.app.get('/terms', function (_req, res) {
  res.render('terms', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})
server.app.get('/admin', function (_req, res) {
  db.find({ score: { $exists: true }, deleted: 0 }).sort({ score: -1 }).exec(function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      console.log(docs)
      var groups = _.groupBy(docs, function (date) {
        console.log(date.startDate)
        return moment(date.startDate).startOf('day').format()
      })
      console.log(groups)
      res.render('admin', { title: 'Settings', subtitle: '', ip: ip + ':3000', scoreboard: docs })
    }
  })
})
server.app.get('/stats', function (_req, res) {
  db.find({ score: { $exists: true } }).sort({ score: -1 }).exec(function (err, docs) {
    if (err) {
      console.log(err)
    } else {
      console.log(docs)
      var groups = _.groupBy(docs, function (date) {
        console.log(date.startDate)
        return moment(date.startDate).startOf('day').format()
      })
      console.log(groups.length)
      var array = Object.values(groups)
      res.render('stats', { title: 'Stats', subtitle: '', ip: ip + ':3000', stats: array })
    }
  })
})
server.app.get('/delete', function (req, res) {
  console.log(req.query.recordID)
  db.update({ _id: req.query.recordID }, { $set: { deleted:1 } }, { multi: false }, function (err, numReplaced) {
    if (err) {
      log.info(err)
    } else {
      updateLeaderboardCounts()
      res.redirect(301, '/admin')
    }
  })
  // db.remove({ _id: req.query.recordID }, {}, function (err, numRemoved) {
  //   // numRemoved = 1
  //   res.redirect(301, '/admin')
  // })
  // db.find({ score: { $exists: true } }).sort({ score: -1 }).exec(function (err, docs) {
  //   if (err) {
  //     console.log(err)
  //   } else {
  //     console.log(docs)
  //     res.render('admin', { title: 'Settings', subtitle: '', ip: ip + ':3000', scoreboard: docs })
  //   }
  // })
})
server.app.get('/deleteall2', function (req, res) {
  // console.log(req.query.recordID)
  db.update({ score: { $exists: true }}, { $set: { deleted:1 } }, { multi: true }, function (err, numReplaced) {
    if (err) {
      log.info(err)
    } else {
      updateLeaderboardCounts()
      res.redirect(302, '/admin')
    }
  })
  // db.remove({ _id: req.query.recordID }, {}, function (err, numRemoved) {
  //   // numRemoved = 1
  //   res.redirect(301, '/admin')
  // })
  // db.find({ score: { $exists: true } }).sort({ score: -1 }).exec(function (err, docs) {
  //   if (err) {
  //     console.log(err)
  //   } else {
  //     console.log(docs)
  //     res.render('admin', { title: 'Settings', subtitle: '', ip: ip + ':3000', scoreboard: docs })
  //   }
  // })
})

server.app.get('/refresh', function (req, res) {
  server.io.emit('refresh', { deviceName: 'Bat 5' })
  setTimeout(() => {
    res.redirect(302, '/')
  }, 500);
  
  // db.remove({ _id: req.query.recordID }, {}, function (err, numRemoved) {
  //   // numRemoved = 1
  //   res.redirect(301, '/admin')
  // })
  // db.find({ score: { $exists: true } }).sort({ score: -1 }).exec(function (err, docs) {
  //   if (err) {
  //     console.log(err)
  //   } else {
  //     console.log(docs)
  //     res.render('admin', { title: 'Settings', subtitle: '', ip: ip + ':3000', scoreboard: docs })
  //   }
  // })
})

server.app.get('/registration', function (_req, res) {
  res.render('registration', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})
server.app.get('/sockettest', function (_req, res) {
  res.render('sockettest', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})

// var randomName = faker.internet.userName();
// var score = faker.datatype.number({ 'min': 10, 'max': 10000 })
// var newdoc = {}
// moment().toString()
// newdoc.nickname = randomName
// newdoc.score = score
// newdoc.startDate = moment().subtract(10, 'days').toString()
// db.insert(newdoc, function (err, newDoc) {
//   if(err){
//     console.log(err)
//   }

// })

server.app.post('/startgame', function (req, res) {
  req.body.startDate = moment().toString()
  req.body.deleted = 0
  req.body.inserted = 1
  db.insert(req.body, function (err, newDoc) {
    if (err) {
      console.log(err)
    } else {
      // console.log(newDoc)
      log.info('New Registration Saved')
      log.info(newDoc)
      server.io.emit('startGame', newDoc)
      res.json({ result: 'success', message: 'Game Start Sent' })
    }
  })
})
server.app.get('/bat', function (req, res) {
  res.render('bat', { title: 'Bat', subtitle: '', ip: ip + ':3000' })
})
// server.app.get('/bat2', function (req, res) {
//   log.info('Sending Switch Command bat2')
//   log.info()
//   server.io.emit('connectBat', { deviceName: 'Bat 2' })
//   setTimeout(() => {
//     // res.redirect(301, '/bat')
//   }, 500);
 
//   // res.json({ result: 'success', message: 'Game Start Sent' })
 
// })

server.app.get('/bat5switch', function (req, res) {
  log.info('Sendix`ng Switch Command bat 5  ')
  log.info()
  server.io.emit('connectBat', { deviceName: 'Bat 5' })
  setTimeout(() => {
    res.redirect(302, '/bat')
  }, 500);
})

server.app.get('/bat4switch', function (req, res) {
  log.info('Sendix`ng Switch Command bat 4  ')
  log.info()
  server.io.emit('connectBat', { deviceName: 'Bat 4' })
  setTimeout(() => {
    res.redirect(302, '/bat')
  }, 500);
})

server.app.get('/bat3switch', function (req, res) {
  log.info('Sendix`ng Switch Command bat 3  ')
  log.info()
  server.io.emit('connectBat', { deviceName: 'Bat 3' })
  setTimeout(() => {
    res.redirect(302, '/bat')
  }, 500);
})
server.app.get('/bat2switch', function (req, res) {
  log.info('Sendix`ng Switch Command bat 2')
  log.info()
  server.io.emit('connectBat', { deviceName: 'Bat 2' })
  setTimeout(() => {
    res.redirect(302, '/bat')
  }, 500);
})
server.app.get('/bat1switch', function (req, res) {
  log.info('Sendix`ng Switch Command bat 1')
  log.info()
  server.io.emit('connectBat', { deviceName: 'Bat 1' })
  setTimeout(() => {
    res.redirect(302, '/bat')
  }, 500);
})

//   // res.json({ result: 'success', message: 'Game Start Sent' })

// })
  // server.app.get('/bat3', function (req, res) {
  //   log.info('Sending Switch Command Bat 3')
  //   log.info()
  //   server.io.emit('connectBat', { deviceName: 'Bat 3' })
  //   setTimeout(() => {
  //     // res.redirect(301, '/bat')
  //   }, 500);

  //   res.json({ result: 'success', message: 'Game Start Sent' })
  // })

server.app.post('/gameend', function (req, res) {
  // Forward the game end to anything that listening
  server.io.emit('gameEnd', {})
  res.json({ result: 'success', message: 'Game End Received' })
})
server.app.post('/zerobat', function (req, res) {
  // Forward the zero bat to anything that listening
  log.info('Request to zero bat from app')
  server.io.emit('zerobat', {})
  res.json({ result: 'success', message: 'Forwared Zero Command' })
})

server.app.get('/zeroprompt', function (req, res) {
  // Forward the game end to anything that listening
  server.io.emit('zeroprompt', {})
  res.json({ result: 'success', message: 'Zero Prompt Received' })
})
server.app.get('/zeroconfirm', function (req, res) {
  // Forward the game end to anything that listening
  server.io.emit('zeroconfirm', {})
  res.json({ result: 'success', message: 'Zero Confirmed' })
})
server.app.get('/registrationconfirm', function (req, res) {
  // Forward the game end to anything that listening
  server.io.emit('registrationconfirm', {})
  res.json({ result: 'success', message: 'Registration Confirm' })
})
server.app.get('/startgameconfirmed', function (req, res) {
  // Forward the game end to anything that listening
  server.io.emit('startconfirmed', {})
  res.json({ result: 'success', message: 'Start Confirmed' })
})
server.app.post('/updatescore', function (req, res) {
  log.info('New Scores Received')
  log.info(req.body)
  db.update({ _id: req.body.registrationId }, { $set: { score: parseInt(req.body.score) } }, { multi: false }, function (err, numReplaced) {
    if (err) {
      log.info(err)
    } else {
      if (numReplaced >= 1) {
        log.info('Score Updated')
        db.find({ _id: req.body.registrationId }, function (err, doc) {
          if (err) {
            console.log(err)
          } else {
            log.info(doc)
            db.find({ score: { $exists: true } }).sort({ score: -1 }).limit(50).exec(function (err, docs) {
              if (err) {
                console.log(err)
              } else {
                console.log('All Records:')
                console.log(docs)
                server.io.emit('updateScore', { updatedScore: doc[0], leaderboard: docs })
                ipcRenderer.send('updateScore', { updatedScore: doc[0], leaderboard: docs })
                updateLeaderboardCounts()
                res.json({ result: 'success', message: 'Score Update' })
                log.info('Guest Score - Delay the stock player')
                // clearTimeout(stockPlayerTimeout)
                // stockPlayerTimeout = setTimeout(() => {
                //   showStockPlayer()
                // }, delayBetweenStockPlayers);
              }
            })
          }
        })
      } else {
        log.info(`Error ${req.body} record now found. Counld not update`)
        res.json({ result: 'error', message: 'Record Not Found' })
      }
    }
  })
  // res.render('registration', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})

server.app.get('/controlpanel', function (_req, res) {
  res.render('controlpanel', { title: 'Control Panel', ip: ip + ':5000' })
})

server.app.get('/api/controlsettings', function (_req, res) {
  res.json({
    sbTakeoverTimes: sbTakeoverTimes,
    sbTakeoverDuration: sbTakeoverDuration,
    busTakeoverTimes: busTakeoverTimes,
    busRelaySerial: busRelaySerialNumber,
    busTakeoverMode: busTakeoverMode,
    busAudioVolume: busAudioVolume
  })
})

server.app.get('/triggersbtakeover', function (_req, res) {
  ipcRenderer.send('sbTakeoverStart', { duration: sbTakeoverDuration })
  res.json({ result: 'success', message: 'SBTO triggered' })
})

server.app.get('/triggerbustakeover', function (_req, res) {
  runBusTakeover()
  res.json({ result: 'success', message: 'Bus takeover triggered' })
})

server.app.get('/relay/:channel/on', function (req, res) {
  var ch = req.params.channel === '1' ? '01' : '02'
  relayOn(ch)
  res.json({ result: 'success', message: 'Relay ' + req.params.channel + ' ON' })
})

server.app.get('/relay/:channel/off', function (req, res) {
  var ch = req.params.channel === '1' ? '01' : '02'
  relayOff(ch)
  res.json({ result: 'success', message: 'Relay ' + req.params.channel + ' OFF' })
})

server.app.get('/closescoreboard', function (_req, res) {
  ipcRenderer.send('closeScoreboard')
  res.json({ result: 'success', message: 'Scoreboard closed' })
})

server.app.get('/seeddata', function (_req, res) {
  db.find({ placeholder: true }, function (err, existing) {
    if (err) {
      return res.json({ result: 'error', message: err })
    }
    if (existing.length > 0) {
      return res.json({ result: 'skipped', message: 'Placeholder data already exists (' + existing.length + ' records)' })
    }
    var names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Jamie', 'Quinn', 'Avery',
      'Blake', 'Cameron', 'Dakota', 'Elliot', 'Finley', 'Greer', 'Harper', 'Indigo', 'Jesse', 'Kendall',
      'Lane', 'Mason', 'Noel', 'Owen', 'Parker', 'Reese', 'Sage', 'Tatum', 'Uriel', 'Val']
    var records = names.map(function (name) {
      return {
        nickname: name,
        score: Math.floor(Math.random() * 126) + 30,
        startDate: moment().toString(),
        deleted: 0,
        inserted: 1,
        placeholder: true
      }
    })
    db.insert(records, function (err, newDocs) {
      if (err) {
        res.json({ result: 'error', message: err })
      } else {
        res.json({ result: 'success', message: '30 placeholder records inserted' })
      }
    })
  })
})

server.app.post('/insertscore', function (req, res) {
  log.info('New Score Received')
  log.info(req.body)
  req.body.deleted = 0
  req.body.inserted = 1
  req.body.score = parseInt(req.body.score)
  req.body.nickname = (req.body.nickname || '').trim()
  db.insert(req.body, function (err, newDoc) {
    if (err) {
      console.log(err)
    } else {
      // console.log(newDoc)
      log.info('New Registration Saved')
      log.info(newDoc)
      // server.io.emit('startGame', newDoc)
      db.find({ score: { $exists: true }, deleted: 0 }).sort({ score: -1 }).limit(50).exec(function (err, docs) {
        if (err) {
          console.log(err)
        } else {
          console.log('All Records:')
          console.log(docs)
          // clearTimeout(stockPlayerTimeout)
          // stockPlayerTimeout = setTimeout(() => {
          //   showStockPlayer()
          // }, delayBetweenStockPlayers);
          server.io.emit('updateScore', { updatedScore: newDoc, leaderboard: docs })
          ipcRenderer.send('updateScore', { updatedScore: newDoc, leaderboard: docs })
          updateLeaderboardCounts()
          res.json({ result: 'success', message: 'Score Update' })
        }
      })
    }
  })
  // res.render('registration', { title: 'Settings', subtitle: '', ip: ip + ':3000' })
})

ipcRenderer.on('getInitialLeaderboard', function () {
  db.find({ score: { $exists: true }, deleted: 0 }).sort({ score: -1 }).limit(24).exec(function (err, docs) {
    if (!err) {
      ipcRenderer.send('initialLeaderboard', docs)
    }
  })
})

// log.transports.console.level = false;
log.info('Starting')
log.info(process.version)
$(document).ready(function () {
  storage.getMany(['settings', 'eventSettings', 'photosettings', 'sharesettingsStorage', 'framesettingsStorage', 'photoboothsettingsStorage'], function (error, settings) {
    if (error) {
      throw error
    }

    console.log(settings)

    // Load scoreboard settings with defaults
    if (settings.settings) {
      scoreboardSettings.resetDelay = parseInt(settings.settings.resetDelay) || 5000
      scoreboardSettings.animationDuration = parseInt(settings.settings.animationDuration) || 3000
      scoreboardSettings.animationResetDuration = parseInt(settings.settings.animationResetDuration) || 1000
      sbTakeoverTimes = parseSbTakeoverTimes(settings.settings.sbTakeoverTimes)
      sbTakeoverDuration = parseInt(settings.settings.sbTakeoverDuration) || 30
      busTakeoverTimes = parseBusTakeoverTimes(settings.settings.busTakeoverTimes)
      busRelaySerialNumber = settings.settings.busRelaySerialNumber || ''
      busRelay1Delay = parseInt(settings.settings.busRelay1Delay) || 0
      busRelay1OnTime = parseInt(settings.settings.busRelay1OnTime) || 1000
      busRelay2Delay = parseInt(settings.settings.busRelay2Delay) || 0
      busRelay2OnTime = parseInt(settings.settings.busRelay2OnTime) || 1000
      busMp3Delay = parseInt(settings.settings.busMp3Delay) || 0
      busAudioVolume = parseFloat(settings.settings.busAudioVolume)
      if (isNaN(busAudioVolume) || busAudioVolume < 0 || busAudioVolume > 1) busAudioVolume = 1
      busTakeoverMode = settings.settings.busTakeoverMode || 'timer'
      busHighScoreCooldown = parseInt(settings.settings.busHighScoreCooldown) || 60
    }
    console.log('Scoreboard Settings:', scoreboardSettings)
    updateSbTakeoverDisplay()
    updateBusTakeoverDisplay()
    updateLeaderboardCounts()
  })

  setInterval(function () {
    var now = new Date()
    var h = now.getHours()
    var m = now.getMinutes()
    var key = h + ':' + m
    if (key !== sbLastTakeoverKey) {
      var match = sbTakeoverTimes.some(function (t) { return t === m })
      if (match) {
        sbLastTakeoverKey = key
        ipcRenderer.send('sbTakeoverStart', { duration: sbTakeoverDuration })
      }
    }
    if (busTakeoverMode === 'timer' && key !== busLastTakeoverKey) {
      var busMatch = busTakeoverTimes.some(function (t) { return t === m })
      if (busMatch) {
        busLastTakeoverKey = key
        runBusTakeover()
      }
    }
  }, 1000)

  ipcRenderer.on('settingsUpdated', function (event, config) {
    sbTakeoverTimes = parseSbTakeoverTimes(config.sbTakeoverTimes)
    sbTakeoverDuration = parseInt(config.sbTakeoverDuration) || 30
    updateSbTakeoverDisplay()
    busTakeoverTimes = parseBusTakeoverTimes(config.busTakeoverTimes)
    busRelaySerialNumber = config.busRelaySerialNumber || ''
    busRelay1Delay = parseInt(config.busRelay1Delay) || 0
    busRelay1OnTime = parseInt(config.busRelay1OnTime) || 1000
    busRelay2Delay = parseInt(config.busRelay2Delay) || 0
    busRelay2OnTime = parseInt(config.busRelay2OnTime) || 1000
    busMp3Delay = parseInt(config.busMp3Delay) || 0
    busTakeoverMode = config.busTakeoverMode || 'timer'
    busHighScoreCooldown = parseInt(config.busHighScoreCooldown) || 60
    updateBusTakeoverDisplay()
  })

  ipcRenderer.on('busHighScoreTrigger', function () {
    if (busTakeoverMode === 'highscore') {
      var now = Date.now()
      if (now - busLastHighScoreTrigger >= busHighScoreCooldown * 1000) {
        busLastHighScoreTrigger = now
        runBusTakeover()
      }
    }
  })
})

$(function () {
// Button Actions

  $('#closeScoreboard').on('click', function () {
    ipcRenderer.send('closeScoreboard')
  })

  $('#triggerSbTakeover').on('click', _.debounce(function () {
    ipcRenderer.send('sbTakeoverStart', { duration: sbTakeoverDuration })
  }, 3000, true))

  $('#triggerBusTakeover').on('click', _.debounce(function () {
    runBusTakeover()
  }, 5000, true))

  $('#busRelay1On').on('click', function () { relayOn('01') })
  $('#busRelay1Off').on('click', function () { relayOff('01') })
  $('#busRelay2On').on('click', function () { relayOn('02') })
  $('#busRelay2Off').on('click', function () { relayOff('02') })

  $('#busMusicTest').on('click', function () {
    if (busAudio && !busAudio.paused) {
      busAudio.pause()
      busAudio = null
      $('#busMusicTest').text('Test Music')
    } else {
      if (busAudio) { busAudio.pause(); busAudio = null }
      busAudio = new Audio('file:///C:/SB-Scoreboard/busstakeover.mp3')
      busAudio.volume = busAudioVolume
      busAudio.addEventListener('ended', function () {
        busAudio = null
        $('#busMusicTest').text('Test Music')
      })
      busAudio.play().catch(function (err) { log.info('Bus music test error: ' + err.message) })
      $('#busMusicTest').text('Stop Music')
    }
  })

  $('#busVolumeSlider').on('input', function () {
    busAudioVolume = parseFloat($(this).val())
    if (busAudio) busAudio.volume = busAudioVolume
    $('#busVolumeDisplay').text(Math.round(busAudioVolume * 100) + '%')
    storage.get('settings', function (err, s) {
      if (!err) {
        s.busAudioVolume = busAudioVolume
        storage.set('settings', s, function () {})
      }
    })
  })

  $('#updatesharesettings').on('click', function () {
    console.log('Are you sure you want to update?')
  })
  ipcRenderer.on('log', (_event, message) => {
    server.io.emit('log', message)
    $('#log').prepend(`<span><br />${message}</span>`)
    console.log($('#log > span').length)
    if ($('#log > span').length > 100) {
      $('#log > span').slice(-1).remove()
    }
  // $('#log').slice(-200).remove()
  })

  // $('#newShareApp').html(message.share)
  // $('#newShareApp').html(message.shareappname + " Version: " + message.version)
  // $('#updateShareApp').fadeIn();
  // $('#newVerion').fadeIn()
  // console.log(message)
})
