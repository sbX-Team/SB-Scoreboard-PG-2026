(
  function () {
    'use strict'
    const express = require('express')
    const log = require('electron-log')
    const https = require('https')
    const fs = require('fs')
    const path = require('path')
    const os = require('os')
    const selfsigned = require('selfsigned')
    const app = express()
    var server = require('http').Server(app)
    var io = require('socket.io')(server)

    // HTTPS listener (port 5001) — browsers only allow camera access (getUserMedia,
    // used by /scanner) over a secure context, which plain HTTP on a LAN IP doesn't
    // satisfy. Certificate is self-signed and cached on disk; each connecting device
    // will see a one-time "connection not private" warning to click through.
    function getLanIPv4Addresses () {
      var addresses = []
      var ifaces = os.networkInterfaces()
      Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
          if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push(iface.address)
          }
        })
      })
      return addresses
    }

    async function getHttpsOptions () {
      var certDir = 'C:/SB-Scoreboard/certs'
      var certPath = path.join(certDir, 'cert.pem')
      var keyPath = path.join(certDir, 'key.pem')

      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
      }

      var altNames = [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' }
      ]
      getLanIPv4Addresses().forEach(function (addr) {
        altNames.push({ type: 7, ip: addr })
      })

      var pems = await selfsigned.generate([{ name: 'commonName', value: 'sb-scoreboard.local' }], {
        days: 3650,
        keySize: 2048,
        extensions: [{ name: 'subjectAltName', altNames: altNames }]
      })

      fs.mkdirSync(certDir, { recursive: true })
      fs.writeFileSync(certPath, pems.cert)
      fs.writeFileSync(keyPath, pems.private)
      log.info('Generated self-signed HTTPS certificate for: ' + altNames.map(function (a) { return a.value || a.ip }).join(', '))

      return { cert: pems.cert, key: pems.private }
    }

    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      next()
    })
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
    getHttpsOptions().then(function (httpsOptions) {
      var httpsServer = https.createServer(httpsOptions, app)
      io.attach(httpsServer)
      httpsServer.listen(5001, function () {
        log.info('Express HTTPS server listening on port ' + httpsServer.address().port)
      })
    }).catch(function (err) {
      log.error('Failed to start HTTPS server: ' + err.message)
    })
    var exporttest = {}
    exporttest.app = app
    exporttest.io = io
    module.exports = exporttest
  }()
)
