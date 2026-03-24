/* global $, TOS1PreCheck, TOS2PreCheck, waitingDialog, currentImage */
var swiper
$(document).ready(function () {
  // Statup

  // $('.multiple-items').slick({
  //   infinite: false,
  //   slidesToShow: slidesToShow,
  //   swipeToSlide: true
  //   // slidesToScroll:5
  // })
  swiper = new Swiper('.swiper-container', {
    slidesPerView: slidesToShow,
    spaceBetween: 10,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    }
  })







  $('.sliderrow').on('click', '.thumbImage', function () {
    console.log('clicked')

    currentImage = $(this).data('imagename')
    console.log(currentImage)
    $('#mediaArea').velocity('transition.expandOut', {
      duration: 200,
      complete: function () {
        if (currentImage.includes('mp4')) {
          var video = document.getElementById('video')
          video.src = '/photos/' + currentImage
          video.play()
          // $('#mainImage').velocity({ opacity: 0 }, { display: "none" });
          // $('#video').velocity({ opacity:1})
          $('#mainImage').hide()
          $('#video').show()
        } else {
          $('#video').hide()
          $('#mainImage').show()
          $('#mainImage').attr('src', '/photos/' + currentImage)
        }

        console.log('done')
        setTimeout(() => {
          $('#mediaArea').velocity('transition.expandIn', {
            duration: 200,
            complete: function () {
              console.log('done')
            }
          })
        }, 150)
      }
    })
  })
})

socket.on('newPhoto', function (data) {
  console.log('New Photo Received' + data)
  var photo
  var actualname
  if (data.includes('mp4')) {
    console.log('was an mp4')
    actualname = data
    photo = data.replace('mp4', 'png')
    photo = 'thumb_' + photo
    console.log(photo)
  } else {
    actualname = data
    photo = data
  }
  swiper.prependSlide('<div class="swiper-slide"><img src="/photos/' + photo + '" class="thumbImage" data-imagename="' + actualname + '" /></div>')
  swiper.slideTo(0)
  if (swiper.slides.length > 40) {
    console.log('Over 40 slides, Remove 1')
    swiper.removeSlide(39)
    
  }
  swiper.update()

  // $('.multiple-items').slick('slickAdd', '<img src="/photos/' + photo + '" class="thumbImage" data-imagename="' + actualname + '" />', true)
  // $('.multiple-items').slick('slickGoTo', 0, false)
})

// Form Stuff
