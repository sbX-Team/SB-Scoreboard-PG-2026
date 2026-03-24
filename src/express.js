(
  function () {
    'use strict'
    const express = require('express')
    const log = require('electron-log')
    const app = express()
    var server = require('http').Server(app)
    var io = require('socket.io')(server)
    app.use(express.json()) // for parsing application/json
    app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
    app.set('view engine', 'ejs')
    app.set('views', __dirname + '/expressviews/')
    app.use(express.static(__dirname + '/'))
    app.use('/photos', express.static('/SocialBoothSync/sharetabletphotos/'))
    app.use('/assets', express.static('/SocialBoothSync/sharetabletassets/'))
    app.use('/local', express.static('/SB-Scoreboard/'))
    // app.use('/slideshowimages', express.static('/greenscreen/slideshow'))

    // app.use('/assets', express.static(express.static(__dirname + '/expressassets')))



    const isDevMode = process.execPath.match(/dist[\\/]electron/i)
    console.log(isDevMode)
    // app.get('/api/view', function (req, res) {
    //   res.render('greenscreencontroller');
    // })
    server.listen(5000, function () {
      log.info('Express server listening on port ' + server.address().port)
    })
    var exporttest = {}
    exporttest.app = app
    exporttest.io = io
    module.exports = exporttest
  }()
)
