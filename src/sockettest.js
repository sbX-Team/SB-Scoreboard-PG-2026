/* global $, waitingDialog, currentImage, socket, */
$(document).ready(function () {

})

socket.on('connect', () => {
  log('Connected to Socket Server')
  // $events.appendChild(newItem('connect'));
})
socket.on('startGame', function (data) {
  console.log(data)
  log('From Server: <b>startGame</b>')
  // log(data)
  var currentGameData = JSON.stringify(data)
  log(currentGameData)
})
socket.on('updateScore', function (data) {
  console.log(data)
  log('From Server: <b>updateScore</b>')
  // log(data)
  var currentGameData = JSON.stringify(data)
  log(currentGameData)
})
socket.on('gameEnd', function (data) {
  console.log(data)
  log('From Server: <b>gameEnd</b>')

})
socket.on('zerobat', function (data) {
  console.log(data)
  log('From Server: <b>zerobat</b>')
})

function log (message) {
  $('#log').prepend(message + '<br />')
}
