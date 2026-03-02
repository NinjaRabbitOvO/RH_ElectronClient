const { contextBridge, ipcRenderer } = require("electron");

// Keep preload self-contained so it can still run under Electron's sandboxed
// preload environment without requiring local CommonJS modules.
const IPC_CHANNELS = {
  startFileTransfer: "app:start-file-transfer",
  startUdpTransfer: "app:start-udp-transfer",
  listReceivedTransfers: "app:list-received-transfers",
  transferEvent: "app:transfer-event",
  ping: "app:ping",
};

contextBridge.exposeInMainWorld("appApi", {
  filetransfer: {
    onEvent(listener) {
      const handler = (_event, payload) => {
        listener(payload);
      };

      ipcRenderer.on(IPC_CHANNELS.transferEvent, handler);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.transferEvent, handler);
      };
    },
    start(dateText) {
      return ipcRenderer.invoke(IPC_CHANNELS.startFileTransfer, dateText);
    },
    startUdp(dateText) {
      return ipcRenderer.invoke(IPC_CHANNELS.startUdpTransfer, dateText);
    },
    listReceived() {
      return ipcRenderer.invoke(IPC_CHANNELS.listReceivedTransfers);
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
