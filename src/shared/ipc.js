const IPC_CHANNELS = {
  startFileTransfer: "app:start-file-transfer",
  startUdpTransfer: "app:start-udp-transfer",
  listReceivedTransfers: "app:list-received-transfers",
  readReceivedDatFile: "app:read-received-dat-file",
  transferEvent: "app:transfer-event",
  ping: "app:ping",
};

module.exports = {
  IPC_CHANNELS,
};
