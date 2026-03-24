const remote = require('@electron/remote')
const {dialog} = require('@electron/remote')
const {ipcRenderer} = require('electron')
ipcRenderer.on('progress', (event, arg) => {
    $('.progress-bar').css('width', round(arg, 0)+'%').attr('aria-valuenow', round(arg, 0));
    $('.progress-bar').html(round(arg, 0) + '%');
    if(round(arg, 0) == 100){
    	$('#install').show()
    	$('#status').html('Download Complete')
    	console.log('Done')
    }
    // Print 5
    console.log(arg)
    // Invoke method directly on main process
    // main.pong(6);
});

$( "#install" ).click(function() {
  ipcRenderer.send('installupdate')
});

function round(number, precision) {
  var shift = function (number, precision, reverseShift) {
    if (reverseShift) {
      precision = -precision;
    }  
    var numArray = ("" + number).split("e");
    return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
  };
  return shift(Math.round(shift(number, precision, false)), precision, true);
}