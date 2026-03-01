const { ipcMain } = require("electron");

const { IPC_CHANNELS } = require("../shared/ipc");

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
}

module.exports = {
  registerIpcHandlers,
};
