const { ipcMain } = require("electron");

const { IPC_CHANNELS } = require("../shared/ipc");
const {
  listReceivedTransfers,
  readReceivedDatFile,
  runPythonTransfer,
  runUdpTransfer,
} = require("./services/filetransfer");

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.ping, () => "pong");
  ipcMain.handle(IPC_CHANNELS.startFileTransfer, async (event, dateText) => {
    return runPythonTransfer(event.sender, dateText);
  });
  ipcMain.handle(IPC_CHANNELS.startUdpTransfer, async (event, dateText) => {
    return runUdpTransfer(event.sender, dateText);
  });
  ipcMain.handle(IPC_CHANNELS.listReceivedTransfers, async () => {
    return listReceivedTransfers();
  });
  ipcMain.handle(IPC_CHANNELS.readReceivedDatFile, async (_event, request) => {
    return readReceivedDatFile(request);
  });
}

module.exports = {
  registerIpcHandlers,
};
