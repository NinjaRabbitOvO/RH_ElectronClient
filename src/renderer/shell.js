const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const transferDateInput = document.getElementById("transfer-date");
const transferButton = document.getElementById("start-transfer");
const udpTransferButton = document.getElementById("start-udp-transfer");
const transferActionStatus = document.getElementById("transfer-action-status");
const transferHelpNote = document.getElementById("transfer-help-note");
const transferLog = document.getElementById("transfer-log");
const transferGrid = document.querySelector(".transfer-grid");
const transferDetailsToggle = document.getElementById("transfer-details-toggle");
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
const receivedBrowser = document.getElementById("received-browser");
const receivedFolderModal = document.getElementById("received-folder-modal");
const receivedFolderBackdrop = document.getElementById("received-folder-backdrop");
const receivedFolderClose = document.getElementById("received-folder-close");
const receivedFolderTitle = document.getElementById("received-folder-title");
const receivedFolderSummary = document.getElementById("received-folder-summary");
const receivedFolderList = document.getElementById("received-folder-list");
const receivedFileViewer = document.getElementById("received-file-viewer");
const TRANSFER_EVENT_PREFIX = "@@EVENT@@ ";
const filetransferApi =
  window.appApi && window.appApi.filetransfer ? window.appApi.filetransfer : null;

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
    successText: "TCP transfer completed successfully.",
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
    successText: "UDP transfer completed successfully.",
    failText: "UDP transfer failed. Review the error output below.",
    launchLabel: "Launching UDP transfer job...",
  },
};

let currentTransferMode = "tcp";
let transferStreamBuffer = "";
let transferLogLines = [];
let transferLiveLine = "";
let transferRuntime = {
  filesCount: 0,
  completedFiles: 0,
  retries: 0,
};
let receivedTransferFolders = [];
let activeReceivedFolder = "";
let activeReceivedFileName = "";
let receivedViewerRequestId = 0;
const TRANSFER_FAILURE_NOTE =
  "Please verify that you are connected to a nearby device via Wi-Fi, then restart the transfer.";

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
  setTransferHelpNote("");
  setTransferLogCollapsed(true);

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

function normalizeTransferDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
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
  applyTransferConsoleText(text);
}

function setTransferLogCollapsed(collapsed) {
  if (!transferLog) {
    return;
  }

  transferLog.classList.toggle("is-collapsed", collapsed);
}

function setTransferHelpNote(text) {
  if (!transferHelpNote) {
    return;
  }

  const content = text || "";
  transferHelpNote.textContent = content;
  transferHelpNote.classList.toggle("is-visible", Boolean(content));
}

function setTransferDetailsExpanded(expanded) {
  if (!transferGrid || !transferDetailsToggle) {
    return;
  }

  transferGrid.classList.toggle("is-details-collapsed", !expanded);
  transferDetailsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function renderReceivedBrowserMessage(className, text) {
  if (!receivedBrowser) {
    return;
  }

  receivedBrowser.replaceChildren();

  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  receivedBrowser.append(message);
}

function createReceivedFolderCard(folder) {
  const card = document.createElement("article");
  card.className = "received-folder-card";
  if (folder.isSpecial) {
    card.classList.add("is-special-row");
  }

  const trigger = document.createElement("button");
  trigger.className = "received-folder-button";
  trigger.type = "button";
  trigger.setAttribute(
    "aria-label",
    `Open received files for ${folder.dateLabel}`,
  );

  const icon = document.createElement("span");
  icon.className = "received-folder-icon";
  icon.textContent = String(folder.fileCount);

  const meta = document.createElement("div");
  meta.className = "received-folder-meta";

  const date = document.createElement("strong");
  date.className = "received-folder-date";
  date.textContent = folder.dateLabel;

  const type = document.createElement("span");
  type.className = "received-folder-type";
  type.textContent = folder.isSpecial ? "Showcase Folder" : `${folder.protocolHint} Folder`;

  const size = document.createElement("span");
  size.className = "received-folder-size";
  size.textContent = `${folder.fileCount} files | ${formatBytes(folder.totalBytes)}`;

  meta.append(date, type, size);
  trigger.append(icon, meta);
  trigger.addEventListener("click", () => {
    openReceivedFolderModal(folder.folderName);
  });
  card.append(trigger);

  return card;
}

function createReceivedSection(title, subtitle, folders, extraClassName = "") {
  const section = document.createElement("section");
  section.className = `received-section${extraClassName ? ` ${extraClassName}` : ""}`;

  const head = document.createElement("header");
  head.className = "received-section-head";

  const heading = document.createElement("h4");
  heading.className = "received-section-title";
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.className = "received-section-copy";
  copy.textContent = subtitle;

  const grid = document.createElement("div");
  grid.className = "received-folder-grid";

  folders.forEach((folder) => {
    grid.append(createReceivedFolderCard(folder));
  });

  head.append(heading, copy);
  section.append(head, grid);
  return section;
}

function renderReceivedTransferBrowser() {
  if (!receivedBrowser) {
    return;
  }

  receivedBrowser.replaceChildren();

  const specialFolders = receivedTransferFolders.filter((folder) => folder.isSpecial);
  const regularFolders = receivedTransferFolders.filter((folder) => !folder.isSpecial);

  if (!specialFolders.length && !regularFolders.length) {
    renderReceivedBrowserMessage(
      "received-empty",
      "No received files yet. Completed transfers will appear here by date.",
    );
    return;
  }

  if (specialFolders.length) {
    receivedBrowser.append(
      createReceivedSection(
        "Example Data",
        "Showcase dataset bundled with the app for preview and demonstration.",
        specialFolders,
        "is-special",
      ),
    );
  }

  if (regularFolders.length) {
    receivedBrowser.append(
      createReceivedSection(
        "Received Transfers",
        "Files captured from device transfers, grouped by date.",
        regularFolders,
      ),
    );
    return;
  }

  const empty = document.createElement("p");
  empty.className = "received-empty";
  empty.textContent = "No actual receive folders yet. Start a transfer to populate this section.";
  receivedBrowser.append(empty);
}

function findReceivedFolder(folderName) {
  return receivedTransferFolders.find((folder) => folder.folderName === folderName) || null;
}

function formatViewerNumber(value, fractionDigits = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "N/A";
  }
  return numeric.toFixed(fractionDigits);
}

function renderReceivedViewerMessage(className, text) {
  if (!receivedFileViewer) {
    return;
  }

  receivedFileViewer.replaceChildren();
  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  receivedFileViewer.append(message);
}

function createViewerGrid(items) {
  const grid = document.createElement("div");
  grid.className = "received-viewer-grid";

  items.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "received-viewer-item";

    const key = document.createElement("span");
    key.textContent = label;

    const data = document.createElement("strong");
    data.textContent = value;

    item.append(key, data);
    grid.append(item);
  });

  return grid;
}

function renderAxisSection(axisLabel, axisData) {
  const section = document.createElement("section");
  section.className = "received-viewer-section";

  const heading = document.createElement("h5");
  heading.textContent = `${axisLabel} Axis`;
  section.append(heading);

  section.append(
    createViewerGrid([
      ["Count", String(axisData.count)],
      ["Mean", formatViewerNumber(axisData.mean)],
      ["Median", formatViewerNumber(axisData.median)],
      ["Std", formatViewerNumber(axisData.std)],
      ["Threshold", formatViewerNumber(axisData.threshold)],
      ["High Alerts", String(axisData.highCount)],
    ]),
  );

  const alertText = document.createElement("p");
  alertText.className = "received-viewer-note";

  if (!axisData.highCount || !Array.isArray(axisData.highAlerts) || !axisData.highAlerts.length) {
    alertText.textContent = "No high-value alerts.";
    section.append(alertText);
    return section;
  }

  alertText.textContent = `Top ${axisData.highAlerts.length} high-value alerts:`;
  section.append(alertText);

  const alerts = document.createElement("ul");
  alerts.className = "received-viewer-alerts";
  axisData.highAlerts.forEach((entry) => {
    const line = document.createElement("li");
    line.textContent = `idx ${entry.index} = ${entry.value}`;
    alerts.append(line);
  });
  section.append(alerts);

  return section;
}

function renderReceivedDatViewer(payload) {
  if (!receivedFileViewer) {
    return;
  }

  receivedFileViewer.replaceChildren();

  const title = document.createElement("h4");
  title.className = "received-viewer-title";
  title.textContent = payload.file.fileName;
  receivedFileViewer.append(title);

  const utcLine = document.createElement("p");
  utcLine.className = "received-viewer-line";
  utcLine.textContent = payload.header.utcLine;
  receivedFileViewer.append(utcLine);

  const sensors = document.createElement("section");
  sensors.className = "received-viewer-section";
  const sensorsTitle = document.createElement("h5");
  sensorsTitle.textContent = "Sensors";
  sensors.append(sensorsTitle);
  sensors.append(
    createViewerGrid([
      ["Temp1", formatViewerNumber(payload.sensors.temp1)],
      ["Temp2", formatViewerNumber(payload.sensors.temp2)],
      ["Hum Temp", formatViewerNumber(payload.sensors.humTemp)],
      ["Hum", formatViewerNumber(payload.sensors.hum)],
      ["Water", formatViewerNumber(payload.sensors.water)],
      ["Capacitor V", String(payload.sensors.capacitorV)],
      ["Battery V", String(payload.sensors.batV)],
      ["File Size", formatBytes(payload.file.sizeBytes)],
    ]),
  );
  receivedFileViewer.append(sensors);

  const sampling = document.createElement("section");
  sampling.className = "received-viewer-section";
  const samplingTitle = document.createElement("h5");
  samplingTitle.textContent = "Sampling";
  sampling.append(samplingTitle);
  sampling.append(
    createViewerGrid([
      ["Sample Size", String(payload.sampling.sampleSize)],
      ["Start Timestamp", String(payload.sampling.startTimestamp)],
      ["Sample Size2", String(payload.sampling.sampleSize2)],
      ["Trailing Bytes", String(payload.sampling.trailingBytes)],
    ]),
  );
  receivedFileViewer.append(sampling);

  if (payload.axis) {
    receivedFileViewer.append(renderAxisSection("X", payload.axis.x));
    receivedFileViewer.append(renderAxisSection("Y", payload.axis.y));
    receivedFileViewer.append(renderAxisSection("Z", payload.axis.z));
  } else {
    const axisNote = document.createElement("p");
    axisNote.className = "received-viewer-note";
    axisNote.textContent = "Separator is not 0xFF, no XYZ sample arrays in this file.";
    receivedFileViewer.append(axisNote);
  }
}

async function inspectReceivedDatFile(folderName, fileName) {
  if (!receivedFileViewer) {
    return;
  }

  if (!filetransferApi || typeof filetransferApi.readDat !== "function") {
    renderReceivedViewerMessage(
      "received-viewer-error",
      "Dat parser API is unavailable until the app is restarted.",
    );
    return;
  }

  const requestId = Date.now();
  receivedViewerRequestId = requestId;
  renderReceivedViewerMessage("received-viewer-note", "Reading and parsing file...");

  try {
    const result = await filetransferApi.readDat({ folderName, fileName });

    if (receivedViewerRequestId !== requestId) {
      return;
    }

    if (!result || !result.ok) {
      renderReceivedViewerMessage(
        "received-viewer-error",
        result && result.error ? result.error : "Unable to parse selected .dat file.",
      );
      return;
    }

    renderReceivedDatViewer(result.data);
  } catch (error) {
    console.error(error);
    if (receivedViewerRequestId !== requestId) {
      return;
    }
    renderReceivedViewerMessage(
      "received-viewer-error",
      "Dat parser failed to respond.",
    );
  }
}

function renderReceivedFolderModal() {
  if (
    !receivedFolderModal ||
    !receivedFolderTitle ||
    !receivedFolderSummary ||
    !receivedFolderList
  ) {
    return;
  }

  const folder = activeReceivedFolder ? findReceivedFolder(activeReceivedFolder) : null;

  if (!folder) {
    activeReceivedFileName = "";
    receivedFolderModal.hidden = true;
    receivedFolderModal.classList.remove("is-open");
    receivedFolderModal.setAttribute("aria-hidden", "true");
    renderReceivedViewerMessage("received-viewer-empty", "Select a .dat file to view parsed content.");
    return;
  }

  receivedFolderTitle.textContent = folder.dateLabel;
  receivedFolderSummary.textContent =
    `${folder.protocolHint} folder | ${folder.fileCount} files | ${formatBytes(folder.totalBytes)}`;
  receivedFolderList.replaceChildren();

  if (!folder.files.length) {
    const empty = document.createElement("p");
    empty.className = "received-modal-empty";
    empty.textContent = "This folder is empty right now.";
    receivedFolderList.append(empty);
    activeReceivedFileName = "";
    renderReceivedViewerMessage("received-viewer-empty", "No .dat files in this folder.");
  } else {
    if (!folder.files.some((file) => file.name === activeReceivedFileName)) {
      activeReceivedFileName = "";
      renderReceivedViewerMessage("received-viewer-empty", "Select a .dat file to view parsed content.");
    }

    folder.files.forEach((file) => {
      const row = document.createElement("button");
      row.className = "received-file-row";
      row.type = "button";
      row.title = `Open ${file.name}`;
      if (file.name === activeReceivedFileName) {
        row.classList.add("is-active");
      }

      const name = document.createElement("span");
      name.className = "received-file-name";
      name.textContent = file.name;

      const sizeLabel = document.createElement("span");
      sizeLabel.className = "received-file-size";
      sizeLabel.textContent = formatBytes(file.size);

      row.append(name, sizeLabel);
      row.addEventListener("click", () => {
        activeReceivedFileName = file.name;
        renderReceivedFolderModal();
        void inspectReceivedDatFile(folder.folderName, file.name);
      });
      receivedFolderList.append(row);
    });
  }

  receivedFolderModal.hidden = false;
  receivedFolderModal.classList.add("is-open");
  receivedFolderModal.setAttribute("aria-hidden", "false");
}

function closeReceivedFolderModal() {
  if (!activeReceivedFolder) {
    return;
  }

  activeReceivedFolder = "";
  activeReceivedFileName = "";
  receivedViewerRequestId = 0;
  renderReceivedViewerMessage("received-viewer-empty", "Select a .dat file to view parsed content.");
  renderReceivedFolderModal();
}

function openReceivedFolderModal(folderName) {
  activeReceivedFolder = folderName;
  activeReceivedFileName = "";
  receivedViewerRequestId = 0;
  renderReceivedViewerMessage("received-viewer-empty", "Select a .dat file to view parsed content.");
  renderReceivedFolderModal();
}

async function refreshReceivedTransferBrowser() {
  if (!receivedBrowser) {
    return;
  }

  if (!filetransferApi || typeof filetransferApi.listReceived !== "function") {
    renderReceivedBrowserMessage(
      "received-error",
      "Received-file browser is unavailable until the app is restarted.",
    );
    return;
  }

  try {
    const result = await filetransferApi.listReceived();
    receivedTransferFolders = result && result.ok ? result.folders : [];

    if (activeReceivedFolder && !findReceivedFolder(activeReceivedFolder)) {
      activeReceivedFolder = "";
      activeReceivedFileName = "";
      receivedViewerRequestId = 0;
    }

    renderReceivedTransferBrowser();
    renderReceivedFolderModal();
  } catch (error) {
    console.error(error);
    closeReceivedFolderModal();
    renderReceivedBrowserMessage(
      "received-error",
      "Unable to load received files right now.",
    );
  }
}

function renderTransferLog() {
  if (!transferLog) {
    return;
  }

  const distanceFromBottom =
    transferLog.scrollHeight - transferLog.scrollTop - transferLog.clientHeight;
  const shouldStickToBottom = distanceFromBottom <= 24;

  const frames = transferLogLines.slice();

  if (transferLiveLine) {
    frames.push(transferLiveLine);
  }

  transferLog.textContent = frames.join("\n");

  if (shouldStickToBottom) {
    transferLog.scrollTop = transferLog.scrollHeight;
    return;
  }

  transferLog.scrollTop = Math.max(
    0,
    transferLog.scrollHeight - transferLog.clientHeight - distanceFromBottom,
  );
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
  transferStreamBuffer = "";
  transferLogLines = [];
  transferLiveLine = "";
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
  setTransferHelpNote("");
  setTransferLogCollapsed(true);
}

function applyTransferConsoleText(text) {
  if (!transferLog || !text) {
    return;
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "\r") {
      if (text[index + 1] === "\n") {
        transferLogLines.push(transferLiveLine);
        transferLiveLine = "";
        index += 1;
      } else {
        transferLiveLine = "";
      }
      continue;
    }

    if (character === "\n") {
      transferLogLines.push(transferLiveLine);
      transferLiveLine = "";
      continue;
    }

    transferLiveLine += character;
  }

  renderTransferLog();
}

function tryHandleStructuredTransferEvent(rawLine) {
  const payloadText = rawLine.trim();

  if (!payloadText) {
    return true;
  }

  try {
    handleStructuredTransferEvent(JSON.parse(payloadText));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
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

  transferStreamBuffer += String(chunk);

  while (transferStreamBuffer) {
    const eventIndex = transferStreamBuffer.indexOf(TRANSFER_EVENT_PREFIX);

    if (eventIndex === -1) {
      applyTransferConsoleText(transferStreamBuffer);
      transferStreamBuffer = "";
      return;
    }

    if (eventIndex > 0) {
      applyTransferConsoleText(transferStreamBuffer.slice(0, eventIndex));
      transferStreamBuffer = transferStreamBuffer.slice(eventIndex);
    }

    const lineBreakMatch = transferStreamBuffer.match(/\r\n|\r|\n/);
    if (!lineBreakMatch || typeof lineBreakMatch.index !== "number") {
      return;
    }

    const lineBreakIndex = lineBreakMatch.index;
    const payloadText = transferStreamBuffer
      .slice(TRANSFER_EVENT_PREFIX.length, lineBreakIndex);

    if (!tryHandleStructuredTransferEvent(payloadText)) {
      applyTransferConsoleText(
        `${TRANSFER_EVENT_PREFIX}${payloadText}${lineBreakMatch[0]}`,
      );
    }

    transferStreamBuffer = transferStreamBuffer.slice(
      lineBreakIndex + lineBreakMatch[0].length,
    );
  }
}

async function startTransfer(modeKey) {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  const mode = TRANSFER_MODES[modeKey];
  if (!mode) {
    return;
  }

  const selectedDate = normalizeTransferDateInput(transferDateInput.value);

  if (!selectedDate) {
    transferActionStatus.textContent = "Please choose a valid transfer date first.";
    return;
  }

  if (!filetransferApi) {
    transferActionStatus.textContent = "Transfer API is unavailable. Restart the app to reload preload scripts.";
    setTransferHelpNote("");
    setTransferLogCollapsed(false);
    transferLog.textContent = "Renderer could not access window.appApi.filetransfer.";
    return;
  }

  currentTransferMode = modeKey;
  resetTransferDashboard(modeKey);
  transferButton.disabled = true;
  udpTransferButton.disabled = true;
  transferActionStatus.textContent = mode.runningText;
  setTransferHelpNote("");
  setTransferLogCollapsed(true);
  transferStreamBuffer = "";
  transferLogLines = [];
  transferLiveLine = "";
  appendTransferLog(`${mode.launchLabel}\nSelected date: ${selectedDate}\n`);

  try {
    const result =
      modeKey === "udp"
        ? await filetransferApi.startUdp(selectedDate)
        : await filetransferApi.start(selectedDate);

    if (!result.ok) {
      const errorText = result.error || mode.failText;
      const isTransferFailure = !result.error;

      transferActionStatus.textContent = errorText;
      setTransferHelpNote(isTransferFailure ? TRANSFER_FAILURE_NOTE : "");
      setTransferLogCollapsed(!isTransferFailure);
      appendTransferLog(`\n${errorText || "Failed to launch transfer."}\n`);
      transferButton.disabled = false;
      udpTransferButton.disabled = false;
    }
  } catch (error) {
    transferActionStatus.textContent = "Transfer launch failed before the receiver started.";
    setTransferHelpNote("");
    setTransferLogCollapsed(false);
    transferStreamBuffer = "";
    transferLogLines = [];
    transferLiveLine = "";
    appendTransferLog(error && error.message ? error.message : String(error));
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

  if (filetransferApi && typeof filetransferApi.onEvent === "function") {
    filetransferApi.onEvent((payload) => {
      const mode = TRANSFER_MODES[payload.mode] || TRANSFER_MODES[currentTransferMode];

      if (payload.type === "started") {
        if (payload.mode) {
          renderTransferMode(payload.mode);
        }
        appendTransferLog(`> ${payload.command}\n`);
        transferActionStatus.textContent = mode.runningText;
        setTransferHelpNote("");
        setTransferLogCollapsed(true);
        return;
      }

      if (payload.type === "stdout" || payload.type === "stderr") {
        consumeTransferChunk(payload.chunk);
        return;
      }

      if (payload.type === "error") {
        appendTransferLog(`\n${payload.message}\n`);
        transferActionStatus.textContent = mode.failText;
        setTransferHelpNote(TRANSFER_FAILURE_NOTE);
        setTransferLogCollapsed(false);
        void refreshReceivedTransferBrowser();
        transferButton.disabled = false;
        udpTransferButton.disabled = false;
        return;
      }

      if (payload.type === "exit") {
        if (transferStreamBuffer || transferLiveLine) {
          consumeTransferChunk("\n");
        }
        appendTransferLog(
          `\nProcess exited with code ${payload.code}${payload.signal ? ` (${payload.signal})` : ""}.\n`,
        );
        transferActionStatus.textContent = payload.ok ? mode.successText : mode.failText;
        setTransferHelpNote(payload.ok ? "" : TRANSFER_FAILURE_NOTE);
        setTransferLogCollapsed(payload.ok);
        void refreshReceivedTransferBrowser();
        transferButton.disabled = false;
        udpTransferButton.disabled = false;
      }
    });
  } else {
    transferActionStatus.textContent =
      "Realtime transfer events are unavailable until the app is restarted.";
  }

  renderTransferMode(currentTransferMode);
  setTransferDetailsExpanded(false);
  void refreshReceivedTransferBrowser();

  transferButton.addEventListener("click", async () => {
    await startTransfer("tcp");
  });

  udpTransferButton.addEventListener("click", async () => {
    await startTransfer("udp");
  });

  if (transferDetailsToggle) {
    transferDetailsToggle.addEventListener("click", () => {
      const isExpanded = transferDetailsToggle.getAttribute("aria-expanded") === "true";
      setTransferDetailsExpanded(!isExpanded);
    });
  }

  if (receivedFolderBackdrop) {
    receivedFolderBackdrop.addEventListener("click", () => {
      closeReceivedFolderModal();
    });
  }

  if (receivedFolderClose) {
    receivedFolderClose.addEventListener("click", () => {
      closeReceivedFolderModal();
    });
  }

  if (receivedFolderModal) {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !receivedFolderModal.hidden) {
        closeReceivedFolderModal();
      }
    });
  }
}

renderActiveNavigation();
bindHomeWebview();
bindTransferLauncher();
