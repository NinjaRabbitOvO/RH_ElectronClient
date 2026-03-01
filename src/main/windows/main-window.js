const path = require("node:path");

const { BrowserWindow } = require("electron");

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f4f1ea",
    webPreferences: {
      preload: path.join(__dirname, "..", "..", "preload", "index.js"),
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.loadFile(path.join(__dirname, "..", "..", "renderer", "index.html"));

  return window;
}

module.exports = {
  createMainWindow,
};
