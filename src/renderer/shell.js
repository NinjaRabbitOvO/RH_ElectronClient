const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const transferDateInput = document.getElementById("transfer-date");
const transferButton = document.getElementById("start-transfer");
const udpTransferButton = document.getElementById("start-udp-transfer");
const transferActionStatus = document.getElementById("transfer-action-status");
const transferLog = document.getElementById("transfer-log");
const protocolEndpoint = document.getElementById("protocol-endpoint");
const protocolStatus = document.getElementById("protocol-status");
const protocolTitle = document.getElementById("protocol-title");
const protocolCommands = document.getElementById("protocol-commands");
const queueTitle = document.getElementById("queue-title");
const folderRule = document.getElementById("folder-rule");
const folderCopy = document.getElementById("folder-copy");
const statCurrentFile = document.getElementById("stat-current-file");
const statFileSize = document.getElementById("stat-file-size");
const statWriteSpeed = document.getElementById("stat-write-speed");
const statRemaining = document.getElementById("stat-remaining");
const transferProgressBar = document.getElementById("transfer-progress-bar");
const transferProgressText = document.getElementById("transfer-progress-text");
const summaryTotalBytes = document.getElementById("summary-total-bytes");
const summaryTotalDuration = document.getElementById("summary-total-duration");
const summaryAverageRate = document.getElementById("summary-average-rate");
const summaryExtra = document.getElementById("summary-extra");

const TRANSFER_MODES = {
  tcp: {
    endpoint: "192.168.4.1:27050",
    status: "TCP Connected Flow",
    title: "TCP Command Stream",
    queueTitle: "Request Pattern",
    folderRule: "REYYYYMMDD",
    folderCopy: "Each input date maps to a dedicated receive directory.",
    metrics: {
      transport: "TCP",
      read: "8192 B",
      block: "32768 B",
      finish: "0x21",
    },
    commands: [
      ["0x11", "Request DK", "Initial handshake before the first date batch starts."],
      ["0x12", "Receive DK", "Reads a fixed 32-byte key block from the server."],
      ["0x02", "Files Count", "Receives the total file count for the selected date."],
      ["0x03", "File Payload", "Reads file name, size, then writes the stream in chunks."],
      ["0x04", "End Of Files", "Marks the end of the current date batch."],
    ],
    pendingText: "Choose a date, then launch the Python TCP receiver.",
    runningText: "Running Python TCP receiver...",
    successText: "TCP transfer completed. Review the log output below.",
    failText: "TCP transfer failed. Review the error output below.",
    launchLabel: "Launching TCP transfer job...",
  },
  udp: {
    endpoint: "192.168.4.1:6000",
    status: "UDP Packet Flow",
    title: "UDP Packet Sequence",
    queueTitle: "Batch Discovery",
    folderRule: "ReYYYYMMDD",
    folderCopy: "The UDP client stores files in a ReYYYYMMDD directory and appends .dat files.",
    metrics: {
      transport: "UDP",
      read: "4096 B",
      block: "1450 B",
      finish: "MSG_FILE_END",
    },
    commands: [
      ["0x01", "HELLO", "Starts a session and waits for HELLO_RSP."],
      ["0x20", "LIST FILES", "Enumerates files for the selected date and optional since cursor."],
      ["0x30", "GET FILE", "Requests a file and negotiates block size."],
      ["0x32", "DATA", "Streams payload packets with sequence and offset fields."],
      ["0x33", "ACK", "Acknowledges each accepted packet back to the server."],
      ["0x34", "FILE END", "Finalizes a file and validates CRC when present."],
    ],
    pendingText: "Choose a date, then launch the Python UDP receiver.",
    runningText: "Running Python UDP receiver...",
    successText: "UDP transfer completed. Review the log output below.",
    failText: "UDP transfer failed. Review the error output below.",
    launchLabel: "Launching UDP transfer job...",
  },
};

let currentTransferMode = "tcp";
let transferLineBuffer = "";
let transferRuntime = {
  filesCount: 0,
  completedFiles: 0,
  retries: 0,
};

function renderActiveNavigation() {
  const currentPage = document.body.dataset.currentPage;

  navButtons.forEach((button) => {
    const isActive = button.dataset.pageLink === currentPage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function bindHomeWebview() {
  if (!homeWebview) {
    return;
  }

  homeWebview.addEventListener("dom-ready", () => {
  });

  homeWebview.addEventListener("did-fail-load", () => {
    console.error("Google page could not be loaded in the embedded view.");
  });
}

function renderMetricValue(id, value) {
  const target = document.getElementById(id);
  if (target) {
    target.textContent = value;
  }
}

function renderProtocolCommands(commands) {
  if (!protocolCommands) {
    return;
  }

  protocolCommands.replaceChildren();

  commands.forEach(([code, title, description]) => {
    const item = document.createElement("div");
    item.className = "command-item";

    const codeNode = document.createElement("span");
    codeNode.className = "command-code";
    codeNode.textContent = code;

    const body = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const descriptionNode = document.createElement("p");
    descriptionNode.textContent = description;

    body.append(titleNode, descriptionNode);
    item.append(codeNode, body);
    protocolCommands.append(item);
  });
}

function renderTransferMode(modeKey) {
  const mode = TRANSFER_MODES[modeKey];

  if (!mode) {
    return;
  }

  currentTransferMode = modeKey;

  if (protocolEndpoint) {
    protocolEndpoint.textContent = mode.endpoint;
  }

  if (protocolStatus) {
    protocolStatus.textContent = mode.status;
  }

  if (protocolTitle) {
    protocolTitle.textContent = mode.title;
  }

  if (queueTitle) {
    queueTitle.textContent = mode.queueTitle;
  }

  if (folderRule) {
    folderRule.textContent = mode.folderRule;
  }

  if (folderCopy) {
    folderCopy.textContent = mode.folderCopy;
  }

  renderMetricValue("metric-transport", mode.metrics.transport);
  renderMetricValue("metric-read", mode.metrics.read);
  renderMetricValue("metric-block", mode.metrics.block);
  renderMetricValue("metric-finish", mode.metrics.finish);
  renderProtocolCommands(mode.commands);

  if (transferActionStatus) {
    transferActionStatus.textContent = mode.pendingText;
  }
}

function getDefaultTransferDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBytes(value) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = Number(value) || 0;
  let index = 0;

  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }

  if (amount >= 100 || index === 0) {
    return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  return `${amount.toFixed(2)} ${units[index]}`;
}

function formatSpeed(bytesPerSecond) {
  const rate = Number(bytesPerSecond) || 0;
  return `${formatBytes(rate)}/s`;
}

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  return `${total.toFixed(1)} s`;
}

function appendTransferLog(text) {
  if (!transferLog || !text) {
    return;
  }

  if (transferLog.textContent === "Waiting for execution...") {
    transferLog.textContent = "";
  }

  transferLog.textContent += text;
  transferLog.scrollTop = transferLog.scrollHeight;
}

function updateText(node, text) {
  if (node) {
    node.textContent = text;
  }
}

function updateProgress(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));

  if (transferProgressBar) {
    transferProgressBar.style.width = `${clamped}%`;
  }

  if (transferProgressText) {
    transferProgressText.textContent = `${clamped.toFixed(2)}%`;
  }
}

function resetTransferDashboard(modeKey) {
  transferLineBuffer = "";
  transferRuntime = {
    filesCount: 0,
    completedFiles: 0,
    retries: 0,
  };

  renderTransferMode(modeKey);
  updateText(statCurrentFile, "Waiting");
  updateText(statFileSize, "0 B");
  updateText(statWriteSpeed, "0 B/s");
  updateText(statRemaining, "0 B");
  updateText(summaryTotalBytes, "0 B");
  updateText(summaryTotalDuration, "0.0 s");
  updateText(summaryAverageRate, "0 B/s");
  updateText(summaryExtra, "0 / 0");
  updateProgress(0);
}

function handleStructuredTransferEvent(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") {
    return;
  }

  if (eventPayload.type === "session") {
    if (eventPayload.endpoint) {
      updateText(protocolEndpoint, eventPayload.endpoint);
    }
    return;
  }

  if (eventPayload.type === "files_count") {
    transferRuntime.filesCount = Number(eventPayload.count) || 0;
    updateText(summaryExtra, `${transferRuntime.filesCount} / ${transferRuntime.retries}`);
    return;
  }

  if (eventPayload.type === "file_start") {
    updateText(statCurrentFile, eventPayload.name || "Unknown");
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, "0 B/s");
    updateText(statRemaining, formatBytes(eventPayload.remaining));
    updateProgress(eventPayload.percent);
    return;
  }

  if (eventPayload.type === "file_progress") {
    updateText(statCurrentFile, eventPayload.name || "Unknown");
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, formatSpeed(eventPayload.bps));
    updateText(statRemaining, formatBytes(eventPayload.remaining));
    updateProgress(eventPayload.percent);
    return;
  }

  if (eventPayload.type === "file_done") {
    transferRuntime.completedFiles += 1;
    updateText(statCurrentFile, eventPayload.name || "Done");
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, formatSpeed(eventPayload.bps));
    updateText(statRemaining, "0 B");
    updateProgress(100);
    updateText(summaryExtra, `${transferRuntime.completedFiles} / ${transferRuntime.retries}`);
    return;
  }

  if (eventPayload.type === "summary") {
    if (typeof eventPayload.total_retries === "number") {
      transferRuntime.retries = eventPayload.total_retries;
    }
    if (typeof eventPayload.total_files === "number") {
      transferRuntime.completedFiles = eventPayload.total_files;
    }

    updateText(summaryTotalBytes, formatBytes(eventPayload.total_bytes));
    updateText(summaryTotalDuration, formatDuration(eventPayload.elapsed));
    updateText(
      summaryAverageRate,
      eventPayload.average_rate || formatSpeed(eventPayload.average_bps),
    );
    updateText(summaryExtra, `${transferRuntime.completedFiles} / ${transferRuntime.retries}`);
  }
}

function consumeTransferChunk(chunk) {
  if (!chunk) {
    return;
  }

  transferLineBuffer += String(chunk).replace(/\r/g, "\n");
  const lines = transferLineBuffer.split("\n");
  transferLineBuffer = lines.pop() || "";

  lines.forEach((line) => {
    if (!line) {
      appendTransferLog("\n");
      return;
    }

    if (line.startsWith("@@EVENT@@ ")) {
      try {
        handleStructuredTransferEvent(JSON.parse(line.slice(10)));
      } catch (error) {
        console.error(error);
      }
      return;
    }

    appendTransferLog(`${line}\n`);
  });
}

async function startTransfer(modeKey) {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  const mode = TRANSFER_MODES[modeKey];
  if (!mode) {
    return;
  }

  const selectedDate = transferDateInput.value;

  if (!selectedDate) {
    transferActionStatus.textContent = "Please choose a transfer date first.";
    return;
  }

  currentTransferMode = modeKey;
  resetTransferDashboard(modeKey);
  transferButton.disabled = true;
  udpTransferButton.disabled = true;
  transferActionStatus.textContent = mode.runningText;
  transferLog.textContent = `${mode.launchLabel}\n`;

  try {
    const result =
      modeKey === "udp"
        ? await window.appApi.filetransfer.startUdp(selectedDate)
        : await window.appApi.filetransfer.start(selectedDate);

    if (!result.ok) {
      transferActionStatus.textContent = result.error || mode.failText;
      appendTransferLog(`\n${result.error || "Failed to launch transfer."}\n`);
      transferButton.disabled = false;
      udpTransferButton.disabled = false;
    }
  } catch (error) {
    transferActionStatus.textContent = "Transfer launch failed before the receiver started.";
    transferLog.textContent = error && error.message ? error.message : String(error);
    transferButton.disabled = false;
    udpTransferButton.disabled = false;
    console.error(error);
  }
}

function bindTransferLauncher() {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  if (!transferDateInput.value) {
    transferDateInput.value = getDefaultTransferDate();
  }

  window.appApi.filetransfer.onEvent((payload) => {
    const mode = TRANSFER_MODES[payload.mode] || TRANSFER_MODES[currentTransferMode];

    if (payload.type === "started") {
      if (payload.mode) {
        renderTransferMode(payload.mode);
      }
      appendTransferLog(`> ${payload.command}\n`);
      transferActionStatus.textContent = mode.runningText;
      return;
    }

    if (payload.type === "stdout" || payload.type === "stderr") {
      consumeTransferChunk(payload.chunk);
      return;
    }

    if (payload.type === "error") {
      appendTransferLog(`\n${payload.message}\n`);
      transferActionStatus.textContent = mode.failText;
      transferButton.disabled = false;
      udpTransferButton.disabled = false;
      return;
    }

    if (payload.type === "exit") {
      if (transferLineBuffer) {
        consumeTransferChunk("\n");
      }
      appendTransferLog(
        `\nProcess exited with code ${payload.code}${payload.signal ? ` (${payload.signal})` : ""}.\n`,
      );
      transferActionStatus.textContent = payload.ok ? mode.successText : mode.failText;
      transferButton.disabled = false;
      udpTransferButton.disabled = false;
    }
  });

  renderTransferMode(currentTransferMode);

  transferButton.addEventListener("click", async () => {
    await startTransfer("tcp");
  });

  udpTransferButton.addEventListener("click", async () => {
    await startTransfer("udp");
  });
}

renderActiveNavigation();
bindHomeWebview();
bindTransferLauncher();
