const path = require('path')
const { merge } = require('webpack-merge')
const base = require('./webpack.base.config')

module.exports = env => {
  return merge(base(env), {
    entry: {
      background: './src/background.js',
      app: './src/app.js',
      update: './src/update.js',
      settings: './src/settings.js',
      express: './src/express.js',
      sockettest: './src/sockettest.js',
      registration: './src/registration.js',
      scoreboard: './src/scoreboard.js',
      admin: './src/admin.js'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, '../app')
    }
  })
};
