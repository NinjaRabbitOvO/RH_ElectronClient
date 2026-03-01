const { contextBridge, ipcRenderer } = require("electron");

const { IPC_CHANNELS } = require("../shared/ipc");

contextBridge.exposeInMainWorld("appApi", {
  filetransfer: {
    start(dateText) {
      return ipcRenderer.invoke(IPC_CHANNELS.startFileTransfer, dateText);
    },
    startUdp(dateText) {
      return ipcRenderer.invoke(IPC_CHANNELS.startUdpTransfer, dateText);
    },
  },
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  ping() {
    return ipcRenderer.invoke(IPC_CHANNELS.ping);
  },
});
