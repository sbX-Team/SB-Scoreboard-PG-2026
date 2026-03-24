var fs = require('fs-extra')

async function copyFiles () {
  try {
    await fs.copy('./app/expressviews', '../syncv3OnlinePreview/expressviews')
    await fs.copy('./app/expressassets', '../syncv3OnlinePreview/expressassets')
    await fs.copy('./src/shareapp.js', '../syncv3OnlinePreview/shareapp.js')
    await fs.copy('./src/shareappgallery.js', '../syncv3OnlinePreview/shareappgallery.js')
    // await fs.copy('./src/shareappGlobal.js', '../syncv3OnlinePreview/shareappGlobal.js')
    console.log('success!')
  } catch (err) {
    console.error(err)
  }
}

copyFiles()