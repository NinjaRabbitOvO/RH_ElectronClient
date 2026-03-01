const { ipcMain } = require("electron");

const { IPC_CHANNELS } = require("../shared/ipc");
const { runPythonTransfer, runUdpTransfer } = require("./services/filetransfer");

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  ipcMain.handle(IPC_CHANNELS.startFileTransfer, async (_event, dateText) => {
    return runPythonTransfer(dateText);
  });
  ipcMain.handle(IPC_CHANNELS.startUdpTransfer, async (_event, dateText) => {
    return runUdpTransfer(dateText);
  });
}

module.exports = {
  registerIpcHandlers,
};
