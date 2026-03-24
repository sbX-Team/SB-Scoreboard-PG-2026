const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = env => {
  const envName = typeof env === 'string' ? env : (Object.keys(env).find(k => !k.startsWith('WEBPACK_')) || 'development');
  return {
    target: 'electron-renderer',
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals()],
    resolve: {
      alias: {
        env: path.resolve(__dirname, `../config/env_${envName}.json`)
      }
    },
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.(png|woff|woff2|eot|ttf|svg)$/,
          type: 'asset/inline',
          parser: { dataUrlCondition: { maxSize: 100000 } }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        }
      ]
    }
  };
};
