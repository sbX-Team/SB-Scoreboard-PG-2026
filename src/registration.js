/* global $, waitingDialog, socket, */

var showZeroPromptTimer
var dialog
$(document).ready(function () {
  $('#registration').parsley().on('field:validated', function () {
    var ok = $('.parsley-error').length === 0
    console.log('Validated')
    $('.bs-callout-info').toggleClass('hidden', !ok)
    $('.bs-callout-warning').toggleClass('hidden', ok)
  }).on('form:submit', function () {
    waitingDialog.show('Save Score...')
    // setTimeout(function () {
    //   waitingDialog.hide();
    // }, 1000);
    console.log('Running')
    var res = {}
    $('#registration input, #registration select').each(function (i, obj) {
    // console.log(i)
    // console.log(obj)
    // console.log(obj.id)
    //   if ($('#' + obj.id).is(':checkbox')) {
    //     if ($('#' + obj.id).is(':checked') != '') {
    //       console.log('Was checked')
    //       res[obj.name] = $(obj).val()
    //     } else {
    //       console.log('Not Checked')
    //     }
    //   } else {
      res[obj.name] = $(obj).val()
    //   }
    })
    console.log(res)
    $.ajax({
      type: 'POST',
      url: '/insertscore',
      data: res,
      success: function (data) {
        if (data.result == 'success') {
          waitingDialog.hide()
          reset()
        }
        console.log(data)
      }
    // dataType: dataType
    })
    console.log(res)
    return false
  // Don't submit form for this demo
  })
})

socket.on('zeroprompt', function (data) {
  console.log('Zero Prompt')
  setTimeout(() => {
    // waitingDialog.hide()
    showZeroPrompt()
  }, 2000)
})

function showZeroPrompt () {
  waitingDialog.hide()
   dialog = bootbox.dialog({
    closeButton: false,
    centerVertical: true,
    message: '<p class="calibratePrompt">Wait until the player is promted to place the bat over home plate.</p>',
    size: 'large',
    buttons: {
      ok: {
        label: 'The bat is over home plate',
        className: 'btn-info',
        callback: function () {
          // console.log('Custom OK clicked')
          $.ajax({
            type: 'POST',
            url: '/zerobat',
            data: { zero: true },
            success: function (data) {
              showZeroPromptTimer = setTimeout(() => {
                showZeroPrompt()
              }, 5000)
              waitingDialog.show('Processing...')
              // reset()
            }
          })
        }
      }
    }
  })
}

socket.on('zeroconfirm', function (data) {
  console.log('Zero Confirm')
  clearTimeout(showZeroPromptTimer)
  // bootbox.hide()
  // dialog.modal('hide')
  waitingDialog.hide()
  setTimeout(() => {
    waitingDialog.show('Game is running...')
  }, 1000)
  // waitingDialog.show('Game is running...')
  // console.log('Zero')
  // setTimeout(function () {
  //   waitingDialog.hide()
  // }, 5000)
  // waitingDialog.hide()
})
socket.on('gameEnd', function (data) {
  console.log('Game Ended')
  setTimeout(function () {
    console.log('Hide Processing Message')
    reset()
    waitingDialog.hide()
  }, 5000)
  // waitingDialog.hide()
})

socket.on('disconnect', function (data) {
  console.log('Lost Connection to server')
  $('#connectionError').show()
})
socket.on('connect', function (data) {
  console.log('socket ON connect', data)
  $('#connectionError').hide()
})

socket.on('reconnect', function () {
  $('#connectionError').hide()
})

function reset () {
  $('#score').val('')
  $('#firstName').val('').removeClass('parsley-success parsley-error')
  $('#lastName').val('').removeClass('parsley-success parsley-error')
  $('input:checkbox').prop('checked', false)
}
