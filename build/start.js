const childProcess = require("child_process");
const electron = require("electron");
const webpack = require("webpack");
const config = require("./webpack.app.config");

const env = "development";
const compiler = webpack(config(env));
let electronStarted = false;

const watching = compiler.watch({}, (err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  if (stats.hasErrors()) {
    console.error(stats.toString({ colors: true, errors: true, warnings: false }));
    return;
  }
  if (!electronStarted) {
    electronStarted = true;

    childProcess
      .spawn(electron, ["."], { stdio: "inherit" })
      .on("close", () => {
        watching.close();
      });
  }
});
