const { app, BrowserWindow } = require("electron");

const { registerIpcHandlers } = require("./ipc");
const { createMainWindow } = require("./windows/main-window");

if (require("electron-squirrel-startup")) {
  app.quit();
}

function bootstrap() {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
