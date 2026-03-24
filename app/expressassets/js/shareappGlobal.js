/* global $, TOS1PreCheck, TOS2PreCheck, waitingDialog, currentImage, socket, preview */
$(document).ready(function () {
  $('#emailTOS1').prop('checked', TOS1PreCheck)
  $('#emailTOS2').prop('checked', TOS2PreCheck)
  $('#smsTOS1').prop('checked', TOS1PreCheck)
  $('#smsTOS2').prop('checked', TOS2PreCheck)
  $('.phone').mask('(000) 000-0000')

  $('#addEmail').on('click', function (e) {
    console.log('Add another email form')
    e.preventDefault()
    // if(x < max_fields){ //max input box allowed
    // x++; //text box increment
    var id = makeid(15)
    $('.emailfields').after('<div class="row extraemail" id="customEmail_' + id + '"><div class="col-md-10"><div class="form-group"><input type="email" class="form-control" id="' + id + '" value="' + $('#email1').val() + '" aria-describedby="emailHelp" placeholder="Enter Email Address" name="emailAddress[]"></div></div><div class="col-md-2"><a href="#" id="" data-removeid="' + id + '" class="removeEmail"><i class="far fa-minus-square fa-2x"></i></a></div></div>') // add input box
    // }
    $('#email1').val('')
    $('#email1').focus()
  })

  $('#addSMS').on('click', function (e) {
    console.log('Add another email form')
    e.preventDefault()

    // if(x < max_fields){ //max input box allowed
    // x++; //text box increment
    var id = makeid(15)
    $('.smsfields').after('<div class="row extrasms" id="customSMS_' + id + '"><div class="col-md-8"><div class="form-group"><input type="phone" class="form-control phone" id="' + id +'" aria-describedby="emailHelp" placeholder="Enter phone number" name="phone[]" value="' + $('#phone').val() + '"></div></div><div class="col-md-2"><a href="#" id="" data-removeid="' + id + '" class="removeSMS"><i class="far fa-minus-square fa-2x"></i></a></div></div>') // add input box
    // }
    $('.phone').mask('(000) 000-0000')
    $('#phone').val('')
    $('#phone').focus()
  })

  $('.emailFieldCatch').on('click', '.removeEmail', function (e) {
    e.preventDefault()
    console.log('Delete')
    console.log($(this).data('removeid'))
    $('#customEmail_' + $(this).data('removeid')).remove()
  })
  $('.smsFieldCatch').on('click', '.removeSMS', function (e) {
    e.preventDefault()
    console.log('Delete')
    console.log($(this).data('removeid'))
    $('#customSMS_' + $(this).data('removeid')).remove()
  })

  $('#emailModal').on('hidden.bs.modal', function () {
    // Reset the form
    $('#email1').val('')
    $('#emailTOS1').prop('checked', TOS1PreCheck)
    $('#emailTOS2').prop('checked', TOS2PreCheck)
    $('#emailoverid').prop('checked', 0)
    $('.extraemail').remove()
  })
  $('#smsModal').on('hidden.bs.modal', function () {
    // Reset the form
    $('#phone').val('')
    $('#smsTOS1').prop('checked', TOS1PreCheck)
    $('#smsTOS2').prop('checked', TOS2PreCheck)
    $('#smsoverid').prop('checked', 0)
    $('.extrasms').remove()
  })
  $('#smsModal').on('shown.bs.modal', function () {
    console.log('SMS Shown')
    // Reset the form
    $('#phone').focus()
  })
  $('#emailModal').on('shown.bs.modal', function () {
    // Reset the form
    console.log('Email Shown')
    $('#email1').focus()
  })
  $('body').on('click', '.startForm',function () {
    console.log('Test')
    $('.share_phone').mask('(000) 000-0000')
    var tosID = $('.tos').attr('id')
    if (tosID) {
      var tos1link = $("label[for='" + tosID + "']").html()
      console.log(tos1link)
      if (tos1link.match(/{link}(.*?){\/link}/g)) {
        console.log('Matched')
        var text = tos1link.match(/{link}(.*?){\/link}/g).map(function (val) {
          return val.replace(/{\/?link}/g, '')
        })
        // texttest.replace(/<\/?link>/g,'')
        console.log(text)
        tos1link = tos1link.replace(/{link}[\s\S]*?{\/link}/, '<a href="#" data-toggle="modal" data-target=".bd-example-modal-lg" data-tos="tos1">' + text + '<\/a>')
        console.log(tos1link)
        $("label[for='" + tosID + "']").html(tos1link)
      } else {
        console.log('No Match')
      }
    }
    var tosID2 = $('.tos2').attr('id')
    if (tosID2) {
      var tos2link = $("label[for='" + tosID2 + "']").html()
      console.log(tos1link)
      if (tos2link.match(/{link}(.*?){\/link}/g)) {
        console.log('Matched')
        var text2 = tos2link.match(/{link}(.*?){\/link}/g).map(function (val) {
          return val.replace(/{\/?link}/g, '')
        })
        // texttest.replace(/<\/?link>/g,'')
        console.log(text2)
        tos2link = tos2link.replace(/{link}[\s\S]*?{\/link}/, '<a href="#" data-toggle="modal" data-target=".bd-example-modal-lg" data-tos="tos2" >' + text2 + '<\/a>')
        console.log(tos2link)
        $("label[for='" + tosID2 + "']").html(tos2link)
      } else {
        console.log('No Match')
      }
    }
   
    setTimeout(() => {
      $.fancybox.close(true)
    }, 300)
    setTimeout(() => {
      $('#test').velocity('transition.bounceLeftIn', {
        complete: function () {
          
        }
      })
    }, 500)
  })
  $(':reset').on('click', function () {
    setTimeout(() => {
      $('#test').velocity('transition.bounceLeftOut', {
        complete: function () {
          console.log('Done Moving form')
          $('#formeo-render').trigger('reset')
        }
      })
    }, 200)
  })
  $('#formeo-render').parsley().on('field:validated', function () {
    var ok = $('.parsley-error').length === 0
    console.log('Validated')
    $('.bs-callout-info').toggleClass('hidden', !ok)
    $('.bs-callout-warning').toggleClass('hidden', ok)
  }).on('form:submit', function () {
    // setTimeout(() => {
      $('#test').velocity('transition.bounceLeftOut', {
        complete: function () {
          console.log('Done Moving form')
          $('#formeo-render').trigger('reset')
        }
      })
      waitingDialog.show('Sending...')
    var res = {}
    var what_t
    $('label').each(function (i, val) {
      if ($(this).text().length > 2) {
        what_t = $('#' + $(this).attr('for'))
        if (what_t.prop('type') == 'text') {
          if (what_t.val() != '') {
            res[$(this).text().replace(/\W/g, '')] = what_t.val()
          }
        }
        if (what_t.prop('type') == 'textarea') {
          console.log($(this).text() + 'Teaxt area' + what_t.val() + what_t.val().length)

          if (what_t.val().length) {
            res[$(this).text().replace(/\W/g, '')] = what_t.val()
          } else {
            console.log('was empyy')
          }
        }
        if (what_t.prop('type') == 'select-one') {
          if (what_t.val() != '') {
            res[$(this).text().replace(/\W/g, '')] = $('#' + $(this).attr('for') + ' option:selected').text()
          }
        }
        if (what_t.prop('type') == 'checkbox') {
          if (what_t.is(':checked') != '') {
            res[$(this).text().replace(/\W/g, '')] = what_t.val()
          }
        }
        if (what_t.prop('type') == 'radio') {
          if (what_t.is(':checked') != '') {
            res[$(this).text().replace(/\W/g, '')] = $(this).text().trim()
          }
        }
      }

      // Don't submit form for this demo
    })
    res.imagename = currentImage
    res.share_phone = $('.share_phone').val()
    res.share_email = $('.share_email').val()
    $.ajax({
      type: 'POST',
      url: '/formsave',
      data: res,
      success: function (data) {
        if (data.result == 'success') {
          waitingDialog.hide()
        }
        console.log(data)
      }
      // dataType: dataType
    })
    console.log(res)
    return false
  })
  $('#smsForm').parsley().on('field:validated', function () {
    var ok = $('.parsley-error').length === 0
    console.log('Validated')
    $('.bs-callout-info').toggleClass('hidden', !ok)
    $('.bs-callout-warning').toggleClass('hidden', ok)
  })
    .on('form:submit', function () {
      $('#smsModal').modal('hide')
      waitingDialog.show('Sending...')
      // setTimeout(function () {
      //   waitingDialog.hide();
      // }, 1000);
      console.log('Running')
      var res = {}
      res.phoneNumber = $("input[name='phone[]']").map(function () { return $(this).val() }).get()
      $('#smsForm input, #smsForm select, #smsForm textarea').each(function (i, obj) {
        // console.log(i)
        // console.log(obj)
        // console.log(obj.id)
        if ($('#' + obj.id).is(':checkbox')) {
          if ($('#' + obj.id).is(':checked') != '') {
            console.log('Was checked')
            res[obj.name] = $(obj).val()
          } else {
            console.log('Not Checked')
          }
        } else {
          res[obj.name] = $(obj).val()
        }
      })

      res.imagename = currentImage
      res.sharetype = 'sms'
      console.log(res)
      $.ajax({
        type: 'POST',
        url: '/sharesave',
        data: res,
        success: function (data) {
          if (data.result == 'success') {
            waitingDialog.hide()
          }
          console.log(data)
        }
        // dataType: dataType
      })
      console.log(res)
      return false
      // Don't submit form for this demo
    })
  $('#emailForm').parsley().on('field:validated', function () {
    var ok = $('.parsley-error').length === 0
    console.log('Validated')
    $('.bs-callout-info').toggleClass('hidden', !ok)
    $('.bs-callout-warning').toggleClass('hidden', ok)
  })
    .on('form:submit', function (e) {
      console.log(e)
      // e.submitEvent.preventDefault();
      this.validationResult = false
      $('#emailModal').modal('hide')
      waitingDialog.show('Sending...')
      // setTimeout(function () {
      //   waitingDialog.hide();
      // }, 1000);
      console.log('Running')
      var res = {}
      res.emailAddresses = $("input[name='emailAddress[]']")
        .map(function () { return $(this).val() }).get()
      $('#emailForm input, #emailForm select, #emailForm textarea').each(function (i, obj) {
        console.log('here' + i)
        console.log('here2' + obj)
        console.log('here3' + obj.id)
        if ($('#' + obj.id).is(':checkbox')) {
          if ($('#' + obj.id).is(':checked') != '') {
            console.log('Was checked')
            res[obj.name] = $(obj).val()
          } else {
            console.log('Not Checked')
          }
        } else {
          res[obj.name] = $(obj).val()
        }
      })

      res.imagename = currentImage
      res.sharetype = 'email'
      $.ajax({
        type: 'POST',
        url: '/sharesave',
        data: res,
        success: function (data) {
          if (data.result == 'success') {
            waitingDialog.hide()
          }
          console.log(data)
        }
        // dataType: dataType
      })
      console.log(res)
      return false
      // Don't submit form for this demo
    })
  $('.bd-example-modal-lg').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var tos = button.data('tos') // Extract info from data-* attributes
    console.log(tos)
    $(this).find('iframe').attr('src', '/' + tos + '/' + preview)
  })
})

socket.on('newCSSServer', function (data) {
  $('link[rel=stylesheet][href*="customstyle"]').remove()
  console.log(data.data)
  $('head').append('<link rel="stylesheet" href="/updated.css/' + data.data + '" type="text/css" />')
  console.log('ran')
})

socket.on('refresh', function (data) {
  location.reload()
})

socket.on('newFormServer', function (data) {
  // location.reload();
  console.log('New Share Form')
  renderer.render(JSON.parse(data))
})
socket.on('disconnect', function (data) {
  console.log('Lost Connection to server')
  $('#connectionError').show()
})
socket.on('connect', function(data){ // <-- this works
  console.log("socket ON connect",data);
});

socket.on('reconnect', function () {
  $('#connectionError').hide()
});

socket.on('error', function (data) {
  console.log(data || 'error');
});

socket.on('connect_failed', function (data) {
  console.log(data || 'connect_failed');
});
// io.on('connection', function (data) {
//   console.log('Connected to server')
//   $('#connectionError').hide()
// })
function makeid (length) {
  var result = ''
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
