const path = require("node:path");

const { BrowserWindow, shell } = require("electron");

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f4f1ea",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      preload: path.join(__dirname, "..", "..", "preload", "index.js"),
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  window.loadFile(path.join(__dirname, "..", "..", "renderer", "shell.html"));

  return window;
}

module.exports = {
  createMainWindow,
};
