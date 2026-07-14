const { ipcRenderer } = require('electron')
const storage = require('electron-json-storage')
storage.setDataPath('c:/SB-Scoreboard')

var resetDelay = 5000
var animationDuration = 3000
var animationResetDuration = 1000
var numScores = 0
var newScoreDisplayTime = 5000
var sbTakeoverDuration = 30

var newScoreBgColor = '#1B459C'

var newLeaderboard = []
let scrolling = false
let delay = 0

var currentLeaderboard = []
var currentPage = 0
var cycleTimer = null
var cycleInterval = 6000
var sbTakeoverActive = false
var pageSize = 8

// Load settings from storage
storage.get('settings', function (error, settings) {
  if (!error && settings) {
    resetDelay = parseInt(settings.resetDelay) || 5000
    animationDuration = parseInt(settings.animationDuration) || 3000
    animationResetDuration = parseInt(settings.animationResetDuration) || 1000
    newScoreDisplayTime = parseInt(settings.newScoreDisplayTime) || 5000
    cycleInterval = parseInt(settings.cycleInterval) || 6000
    sbTakeoverDuration = parseInt(settings.sbTakeoverDuration) || 30
  }
})

ipcRenderer.on('updateScore', function (event, data) {
  console.log(data)
  newLeaderboard.push(data)
  // no updateLeaderboard here — showScore handles it
})

ipcRenderer.on('refresh', function () {
  location.reload()
})

ipcRenderer.on('initialLeaderboard', function (event, data) {
  updateLeaderboard(data)
})

ipcRenderer.on('sbTakeoverStart', function (event, data) {
  var duration = (data && data.duration) ? data.duration * 1000 : sbTakeoverDuration * 1000
  if (data && data.image) {
    document.querySelector('#sbTakeover img').src = 'file:///' + data.image
  }
  sbTakeoverActive = true
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }
  $('#sbTakeover').velocity('transition.fadeIn', {
    duration: 800,
    complete: function () {
      setTimeout(function () {
        $('#sbTakeover').velocity('transition.fadeOut', {
          duration: 800,
          complete: function () {
            sbTakeoverActive = false
            if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }
            renderPage(currentPage, true)
            if (currentLeaderboard.length > pageSize) {
              cycleTimer = setInterval(nextPage, cycleInterval)
            }
          }
        })
      }, duration)
    }
  })
})

ipcRenderer.on('settingsUpdated', function (event, config) {
  sbTakeoverDuration = parseInt(config.sbTakeoverDuration) || 30
})

$(document).ready(function () {
  checkScores()
  ipcRenderer.send('getInitialLeaderboard')
})

function checkScores () {
  if (sbTakeoverActive) {
    setTimeout(checkScores, 100)
    return
  }
  if (newLeaderboard.length > 0) {
    var newLeaderboardPlayer = newLeaderboard.shift()
    console.log(newLeaderboardPlayer)
    delay = 0
    $('#newName').velocity({ opacity: 0 })
    numScores = newLeaderboardPlayer.leaderboard.length
    showScore(newLeaderboardPlayer.leaderboard, newLeaderboardPlayer.updatedScore.score, newLeaderboardPlayer.updatedScore.nickname)
  } else {
    setTimeout(() => {
      checkScores()
    }, 100)
  }
}

function showScore (scoreboard, speed, nickname) {
  console.log('Show Score')
  if (scoreboard.slice(0, 3).some(function (e) { return e.score === speed })) {
    ipcRenderer.send('busHighScoreTrigger')
  }
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }

  var formattedNickname = (nickname || '').toUpperCase()
  var $overlay = $('#newScore')
  document.getElementById('newScoreName').innerHTML = formattedNickname
  document.getElementById('newScoreText').innerHTML = speed

  document.body.style.backgroundColor = newScoreBgColor

  $overlay.velocity('transition.fadeIn', {
    duration: 800,
    complete: function () {
      // Update data only — overlay is covering the leaderboard, no render needed yet
      currentLeaderboard = scoreboard.filter(function (e) {
        return e.nickname && e.nickname.trim().length > 0 && typeof e.score === 'number' && e.score > 0
      }).slice(0, 24)

      setTimeout(function () {
        currentPage = 0
        renderPage(0, true)
        document.body.style.backgroundColor = '#fff'
        $overlay.velocity('transition.fadeOut', {
          duration: 800,
          complete: function () {
            if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }
            if (!sbTakeoverActive && currentLeaderboard.length > pageSize) {
              cycleTimer = setInterval(nextPage, cycleInterval)
            }
            checkScores()
          }
        })
      }, newScoreDisplayTime)
    }
  })
}

function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function subttext (name) {
  if (name > 3 && name < 21) return 'th'
  switch (name % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function incEltNbr (id, endNbr) {
  var elt = document.getElementById(id)
  var increaseSpeed = parseInt(animationDuration / endNbr)
  increaseSpeed -= 5
  incNbrRec(0, endNbr, elt, increaseSpeed)
}

function incNbrRec (i, endNbr, elt, timeincrease) {
  if (i <= endNbr) {
    elt.innerHTML = i
    setTimeout(function () {
      incNbrRec(i + 1, endNbr, elt, timeincrease)
    }, timeincrease)
  }
}

function decEltNbr (id) {
  var elt = document.getElementById(id)
  var startNbr = parseInt(elt.innerHTML) || 0
  if (startNbr === 0) return
  var decreaseSpeed = parseInt(animationResetDuration / startNbr)
  decreaseSpeed -= 5
  decNbrRec(startNbr, elt, decreaseSpeed)
}

function decNbrRec (i, elt, timedecrease) {
  if (i >= 0) {
    elt.innerHTML = i
    setTimeout(function () {
      decNbrRec(i - 1, elt, timedecrease)
    }, timedecrease)
  }
}

function incNbr () {
  incEltNbr('newScoreText')
}

function map_range (value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1)
}

function reset () {}

function updateLeaderboard (leaderboard) {
  currentLeaderboard = leaderboard.filter(function (e) {
    return e.nickname && e.nickname.trim().length > 0 && typeof e.score === 'number' && e.score > 0
  }).slice(0, 24)
  if (cycleTimer) clearInterval(cycleTimer)
  currentPage = 0
  renderPage(0)
  if (currentLeaderboard.length > pageSize) {
    cycleTimer = setInterval(nextPage, cycleInterval)
  }
}

function nextPage () {
  var pages = Math.ceil(currentLeaderboard.length / pageSize)
  if (pages <= 1) return
  currentPage = (currentPage + 1) % pages
  renderPage(currentPage)
}

function renderPage (page, noAnimate) {
  var el1 = document.getElementById('leaderboard1')
  if (!el1) return
  var start = page * pageSize
  var html1 = ''
  for (var i = 0; i < pageSize; i++) {
    var entry = currentLeaderboard[start + i]
    if (entry) {
      html1 += "<tr><td class='place leaderboardValue'>" + (start + i + 1) + "</td><td class='initial leaderboardValue'>" + entry.nickname.toUpperCase() + "</td><td class='score leaderboardValue'>" + entry.score + '</td></tr>'
    }
  }
  if (noAnimate) {
    var $t = $('#leaderboard1')
    $t.velocity('stop', true)
    el1.innerHTML = html1
    $t.css('opacity', 1)
  } else {
    var $table = $('#leaderboard1')
    $table.velocity('stop').velocity({ opacity: 0 }, {
      duration: 400,
      complete: function () {
        el1.innerHTML = html1
        $table.velocity({ opacity: 1 }, { duration: 400 })
      }
    })
  }
}


