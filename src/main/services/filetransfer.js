const { spawn } = require("node:child_process");
const path = require("node:path");
const TCP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "PlusWifi_Client.py");
const UDP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "udp_file_client.py");
const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000;
const { IPC_CHANNELS } = require("../../shared/ipc");

let activeTransfer = null;

function normalizeDateInput(value) {
  if (typeof value !== "string") {
    throw new Error("A transfer date is required.");
  }

  const normalized = value.replace(/\D/g, "").trim();

  if (!/^\d{8}$/.test(normalized)) {
    throw new Error("Transfer date must be in YYYYMMDD or YYYY-MM-DD format.");
  }

  return normalized;
}

function sendTransferEvent(webContents, payload) {
  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  webContents.send(IPC_CHANNELS.transferEvent, payload);
}

function launchTransferProcess(webContents, mode, scriptPath, dateText) {
  const transferDate = normalizeDateInput(dateText);

  if (activeTransfer) {
    return {
      ok: false,
      started: false,
      transferDate,
      error: "Another transfer is already running.",
    };
  }

  const args = ["-3", "-u", scriptPath, transferDate];
  const child = spawn("py", args, {
    cwd: path.dirname(TCP_SCRIPT_PATH),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const timeoutHandle = setTimeout(() => {
    if (activeTransfer && activeTransfer.child === child) {
      child.kill();
    }
  }, EXECUTION_TIMEOUT_MS);

  activeTransfer = {
    child,
    mode,
    transferDate,
  };

  sendTransferEvent(webContents, {
    type: "started",
    mode,
    transferDate,
    command: `py -3 -u ${path.basename(scriptPath)} ${transferDate}`,
  });

  child.stdout.on("data", (chunk) => {
    sendTransferEvent(webContents, {
      type: "stdout",
      mode,
      chunk: String(chunk),
    });
  });

  child.stderr.on("data", (chunk) => {
    sendTransferEvent(webContents, {
      type: "stderr",
      mode,
      chunk: String(chunk),
    });
  });

  child.on("error", (error) => {
    clearTimeout(timeoutHandle);

    if (activeTransfer && activeTransfer.child === child) {
      activeTransfer = null;
    }

    sendTransferEvent(webContents, {
      type: "error",
      mode,
      message: error.message || "Failed to launch transfer process.",
    });
  });

  child.on("close", (code, signal) => {
    clearTimeout(timeoutHandle);

    if (activeTransfer && activeTransfer.child === child) {
      activeTransfer = null;
    }

    sendTransferEvent(webContents, {
      type: "exit",
      mode,
      code,
      signal,
      ok: code === 0,
    });
  });

  return {
    ok: true,
    started: true,
    transferDate,
    mode,
  };
}

async function runPythonTransfer(webContents, dateText) {
  return launchTransferProcess(webContents, "tcp", TCP_SCRIPT_PATH, dateText);
}

async function runUdpTransfer(webContents, dateText) {
  return launchTransferProcess(webContents, "udp", UDP_SCRIPT_PATH, dateText);
}

module.exports = {
  runPythonTransfer,
  runUdpTransfer,
};
