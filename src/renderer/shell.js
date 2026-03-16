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
const wifiReadyButton = document.getElementById("wifi-ready-button");
const wifiReadyList = document.getElementById("wifi-ready-list");
const wifiReadyLabel = document.getElementById("wifi-ready-label");
const wifiReadyStatus = document.getElementById("wifi-ready-status");
const readyConfirmButton = document.getElementById("ready-confirm-button");
const wifiConnectForm = document.getElementById("wifi-connect-form");
const wifiPasswordInput = document.getElementById("wifi-password-input");
const wifiConnectSubmit = document.getElementById("wifi-connect-submit");
const wifiConnectSaved = document.getElementById("wifi-connect-saved");
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
let wifiReadyScanTimer = 0;
let wifiReadySsid = "";
let wifiReadyNetworks = [];
let wifiReadySelectionLocked = false;
let wifiReadyConnected = false;
let wifiReadyScanning = false;
let wifiReadyConnecting = false;
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

function setWifiReadyStatus(text, tone = "") {
  if (!wifiReadyStatus) {
    return;
  }

  wifiReadyStatus.textContent = text || "";
  wifiReadyStatus.classList.toggle("is-success", tone === "success");
  wifiReadyStatus.classList.toggle("is-error", tone === "error");
}

function setReadyConfirmState(connected) {
  if (!readyConfirmButton) {
    return;
  }

  const enabled = Boolean(connected);
  readyConfirmButton.classList.toggle("is-disabled", !enabled);
  readyConfirmButton.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function setWifiInputControlsDisabled(disabled) {
  const isDisabled = Boolean(disabled);
  if (wifiPasswordInput) {
    wifiPasswordInput.disabled = isDisabled;
  }
  if (wifiConnectSubmit) {
    wifiConnectSubmit.disabled = isDisabled;
  }
  if (wifiConnectSaved) {
    wifiConnectSaved.disabled = isDisabled;
  }
}

function setWifiReadyButton(options) {
  if (!wifiReadyButton || !wifiReadyLabel) {
    return;
  }

  const {
    label = "Scanning Wi-Fi...",
    found = false,
    pulsing = false,
    connecting = false,
    connected = false,
    disabled = false,
  } = options || {};

  wifiReadyLabel.textContent = label;
  wifiReadyButton.disabled = Boolean(disabled);
  wifiReadyButton.classList.toggle("is-found", Boolean(found));
  wifiReadyButton.classList.toggle("is-pulsing", Boolean(pulsing));
  wifiReadyButton.classList.toggle("is-connecting", Boolean(connecting));
  wifiReadyButton.classList.toggle("is-connected", Boolean(connected));
}

function createWifiReadyCard(network, options = {}) {
  const {
    selected = false,
    selectionLocked = false,
    disabled = false,
    connecting = false,
    connected = false,
    onClick = null,
  } = options;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wifi-ready-button";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-expanded", selected && wifiConnectForm && !wifiConnectForm.hidden ? "true" : "false");

  if (connected && selected) {
    button.classList.add("is-connected", "is-active");
  } else if (connecting && selected) {
    button.classList.add("is-connecting", "is-active");
  } else {
    if (selected || !selectionLocked) {
      button.classList.add("is-found", "is-pulsing");
    }
    if (selected) {
      button.classList.add("is-active");
    }
  }

  const icon = document.createElement("span");
  icon.className = "wifi-ready-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M2.2 8.8a15.3 15.3 0 0 1 19.6 0" /><path d="M5.9 12.5a10 10 0 0 1 12.2 0" /><path d="M9.6 16.2a4.7 4.7 0 0 1 4.8 0" /><circle cx="12" cy="19.3" r="1.3" /></svg>';

  const label = document.createElement("span");
  label.className = "wifi-ready-name";
  if (connecting && selected) {
    label.textContent = `Connecting ${network.ssid}...`;
  } else {
    label.textContent = network.ssid;
  }

  button.append(icon, label);
  if (typeof onClick === "function") {
    button.addEventListener("click", onClick);
  }

  return button;
}

function renderWifiReadyCards(options = {}) {
  if (!wifiReadyList || !wifiReadyButton || !wifiReadyLabel) {
    return;
  }

  const {
    showScanning = false,
    scanningLabel = "Scanning Wi-Fi...",
    disabled = false,
    connecting = false,
    connected = false,
  } = options;

  if (showScanning || !Array.isArray(wifiReadyNetworks) || !wifiReadyNetworks.length) {
    wifiReadyList.replaceChildren(wifiReadyButton);
    setWifiReadyButton({
      label: scanningLabel,
      found: false,
      pulsing: false,
      connecting: false,
      connected: false,
      disabled,
    });
    return;
  }

  const cards = [];
  wifiReadyNetworks.forEach((network) => {
    const isSelected = network.ssid === wifiReadySsid;
    const card = createWifiReadyCard(network, {
      selected: isSelected,
      disabled,
      connecting,
      connected,
      onClick: () => {
        const changed = wifiReadySsid !== network.ssid;
        wifiReadySsid = network.ssid;
        wifiReadySelectionLocked = true;
        if (changed || !wifiReadyConnected) {
          wifiReadyConnected = false;
          setReadyConfirmState(false);
        }
        renderWifiReadyCards({
          showScanning: false,
          disabled: false,
          connecting: false,
          connected: false,
        });
        if (wifiConnectForm && wifiConnectForm.hidden) {
          showWifiConnectForm();
        }
        setWifiReadyStatus(
          `Selected ${wifiReadySsid}. Enter password, or click Use Saved to connect with stored credentials.`,
        );
      },
      selectionLocked: wifiReadySelectionLocked,
    });
    cards.push(card);
  });

  wifiReadyList.replaceChildren(...cards);
}

function scheduleWifiScan(delayMs = 5000) {
  if (wifiReadyScanTimer) {
    window.clearTimeout(wifiReadyScanTimer);
  }

  wifiReadyScanTimer = window.setTimeout(() => {
    void scanReadyCheckWifi({ silent: true });
  }, delayMs);
}

function hideWifiConnectForm() {
  if (!wifiConnectForm || !wifiReadyButton) {
    return;
  }

  wifiConnectForm.hidden = true;
  wifiReadyButton.setAttribute("aria-expanded", "false");
}

function showWifiConnectForm() {
  if (!wifiConnectForm || !wifiReadyButton) {
    return;
  }

  renderWifiReadyCards({
    showScanning: false,
    disabled: false,
    connecting: wifiReadyConnecting,
    connected: false,
  });
  wifiConnectForm.hidden = false;
  wifiReadyButton.setAttribute("aria-expanded", "true");
  if (wifiPasswordInput) {
    wifiPasswordInput.focus();
  }
}

async function scanReadyCheckWifi(options = {}) {
  if (!wifiReadyButton || !wifiReadyLabel || !wifiReadyStatus) {
    return;
  }

  if (wifiReadyScanning || wifiReadyConnecting) {
    return;
  }

  const { silent = false } = options;
  wifiReadyScanning = true;

  if (!silent) {
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: "Scanning Wi-Fi...",
      disabled: true,
    });
    setWifiReadyStatus("Scanning for nearby ESP-* networks...");
  }

  if (!filetransferApi || typeof filetransferApi.scanWifi !== "function") {
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: "Wi-Fi API Unavailable",
      disabled: true,
    });
    setWifiReadyStatus("Renderer could not access Wi-Fi API. Please restart the app.", "error");
    wifiReadyScanning = false;
    return;
  }

  try {
    const result = await filetransferApi.scanWifi();

    if (!result || !result.ok) {
      const errorText = result && result.error ? result.error : "Unable to scan Wi-Fi networks.";
      const hasLastKnown = Boolean(wifiReadySsid);
      wifiReadyNetworks = hasLastKnown
        ? [{ ssid: wifiReadySsid, signal: 0, stale: true }]
        : [];

      if (hasLastKnown) {
        renderWifiReadyCards({
          showScanning: false,
          disabled: false,
          connecting: false,
          connected: false,
        });
        setWifiReadyStatus(
          `Using last detected ${wifiReadySsid}. Scan warning: ${errorText}`,
          "error",
        );
        scheduleWifiScan(7000);
        return;
      }

      renderWifiReadyCards({
        showScanning: true,
        scanningLabel: "Scan Failed - Retry",
        disabled: false,
      });
      setWifiReadyStatus(errorText, "error");
      scheduleWifiScan(7000);
      return;
    }

    const networkCandidates = Array.isArray(result.networks)
      ? result.networks.filter((network) => network && network.ssid)
      : [];
    wifiReadyNetworks = networkCandidates;

    if (wifiReadySsid && !wifiReadyNetworks.some((item) => item.ssid === wifiReadySsid)) {
      wifiReadySsid = "";
      wifiReadySelectionLocked = false;
      wifiReadyConnected = false;
      setReadyConfirmState(false);
    }

    if (!wifiReadySsid && wifiReadyNetworks.length) {
      wifiReadySsid = wifiReadyNetworks[0].ssid;
      wifiReadySelectionLocked = false;
      wifiReadyConnected = false;
      setReadyConfirmState(false);
    }

    const bestNetwork = wifiReadyNetworks.find((item) => item.ssid === wifiReadySsid)
      || wifiReadyNetworks[0]
      || null;

    if (bestNetwork) {
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });

      const prefix = result.requestedEnable
        ? "Wi-Fi adapter enabled. "
        : "";
      const networkCount = wifiReadyNetworks.length;
      const networkHint =
        networkCount > 1
          ? `Detected ${networkCount} ESP networks. Click one of the green cards to continue.`
          : `Detected ${wifiReadySsid}.`;
      setWifiReadyStatus(
        `${prefix}${networkHint} Click to choose network and connect.`,
        "success",
      );
      scheduleWifiScan(12000);
      return;
    }

    if (wifiReadySsid) {
      wifiReadyNetworks = [{ ssid: wifiReadySsid, signal: 0, stale: true }];
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(
        `No ESP network in this scan. Keeping last detected ${wifiReadySsid}.`,
      );
      scheduleWifiScan(5000);
      return;
    }

    wifiReadyNetworks = [];
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    hideWifiConnectForm();
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: "Scanning Wi-Fi...",
      disabled: false,
    });
    setWifiReadyStatus("No ESP-* network found yet. Keep the device nearby and wait for refresh.");
    scheduleWifiScan(5000);
  } catch (error) {
    console.error(error);
    if (wifiReadySsid) {
      wifiReadyNetworks = [{ ssid: wifiReadySsid, signal: 0, stale: true }];
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(
        `Scan exception; keeping ${wifiReadySsid}. ${error && error.message ? error.message : ""}`,
        "error",
      );
      scheduleWifiScan(7000);
      return;
    }

    wifiReadyNetworks = [];
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: "Scan Failed - Retry",
      disabled: false,
    });
    setWifiReadyStatus(
      error && error.message ? error.message : "Wi-Fi scan failed unexpectedly.",
      "error",
    );
    scheduleWifiScan(7000);
  } finally {
    wifiReadyScanning = false;
  }
}

async function connectReadyWifi(options = {}) {
  if (!wifiReadySsid) {
    setWifiReadyStatus("Please wait until an ESP-* network is detected.", "error");
    return;
  }

  if (!wifiPasswordInput) {
    return;
  }

  const { useSavedProfile = false } = options;
  const password = useSavedProfile ? "" : wifiPasswordInput.value.trim();

  if (!filetransferApi || typeof filetransferApi.connectWifi !== "function") {
    setWifiReadyStatus("Wi-Fi connect API is unavailable. Restart the app and try again.", "error");
    return;
  }

  wifiReadyConnecting = true;
  wifiReadyConnected = false;
  setReadyConfirmState(false);
  setWifiInputControlsDisabled(true);
  renderWifiReadyCards({
    showScanning: false,
    disabled: true,
    connecting: true,
    connected: false,
  });
  if (useSavedProfile || !password) {
    setWifiReadyStatus(`Trying saved profile for ${wifiReadySsid}...`);
  } else {
    setWifiReadyStatus(`Trying to connect to ${wifiReadySsid}...`);
  }

  try {
    const result = await filetransferApi.connectWifi({
      ssid: wifiReadySsid,
      password,
    });

    if (!result || !result.ok) {
      const errorText = result && result.error ? result.error : "Wi-Fi connection failed.";
      wifiReadyConnected = false;
      setReadyConfirmState(false);
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(errorText, "error");
      return;
    }

    hideWifiConnectForm();
    wifiPasswordInput.value = "";
    wifiReadyConnected = true;
    setReadyConfirmState(true);
    renderWifiReadyCards({
      showScanning: false,
      disabled: false,
      connecting: false,
      connected: true,
    });
    setWifiReadyStatus(result.message || `Connected to ${wifiReadySsid}.`, "success");
  } catch (error) {
    console.error(error);
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    renderWifiReadyCards({
      showScanning: !wifiReadySsid,
      scanningLabel: wifiReadySsid ? "Scanning Wi-Fi..." : "Scan Wi-Fi",
      disabled: false,
      connecting: false,
      connected: false,
    });
    setWifiReadyStatus(
      error && error.message ? error.message : "Wi-Fi connection failed unexpectedly.",
      "error",
    );
  } finally {
    wifiReadyConnecting = false;
    setWifiInputControlsDisabled(false);
  }
}

function bindReadyCheckWifi() {
  if (!wifiReadyButton || !wifiReadyLabel || !wifiReadyStatus) {
    return;
  }

  setReadyConfirmState(false);

  wifiReadyButton.addEventListener("click", () => {
    if (!wifiReadySsid) {
      void scanReadyCheckWifi();
      return;
    }

    if (!wifiConnectForm) {
      return;
    }

    if (wifiConnectForm.hidden) {
      showWifiConnectForm();
    } else {
      hideWifiConnectForm();
    }
  });

  if (wifiConnectForm) {
    wifiConnectForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void connectReadyWifi({ useSavedProfile: false });
    });
  }

  if (wifiConnectSaved) {
    wifiConnectSaved.addEventListener("click", () => {
      void connectReadyWifi({ useSavedProfile: true });
    });
  }

  if (readyConfirmButton) {
    readyConfirmButton.addEventListener("click", (event) => {
      if (readyConfirmButton.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        setWifiReadyStatus("Please connect to a nearby ESP Wi-Fi successfully before confirming.", "error");
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    if (wifiReadyScanTimer) {
      window.clearTimeout(wifiReadyScanTimer);
      wifiReadyScanTimer = 0;
    }
  });

  void scanReadyCheckWifi();
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

function downsampleSeries(values, maxPoints = 420) {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }

  if (values.length <= maxPoints) {
    return values
      .map((value, index) => ({ index, value: Number(value) }))
      .filter((point) => Number.isFinite(point.value));
  }

  const step = values.length / maxPoints;
  const points = [];

  for (let slot = 0; slot < maxPoints; slot += 1) {
    const sourceIndex = Math.min(values.length - 1, Math.floor((slot + 0.5) * step));
    const value = Number(values[sourceIndex]);
    if (Number.isFinite(value)) {
      points.push({ index: sourceIndex, value });
    }
  }

  return points;
}

function drawAxisChart(canvas, axisData) {
  const rawValues = axisData && Array.isArray(axisData.values) ? axisData.values : [];
  const points = downsampleSeries(rawValues);
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(360, Math.floor(rect.width || 640));
  const cssHeight = Math.max(160, Math.floor(rect.height || 190));
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(cssWidth * pixelRatio);
  canvas.height = Math.floor(cssHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  if (!points.length) {
    context.fillStyle = "#6f87a0";
    context.font = "600 14px 'Segoe UI', sans-serif";
    context.fillText("No sample points in this file.", 14, 28);
    return;
  }

  const threshold = Number(axisData && axisData.threshold);
  const valuesOnly = points.map((point) => point.value);
  let minValue = Math.min(...valuesOnly);
  let maxValue = Math.max(...valuesOnly);

  if (Number.isFinite(threshold)) {
    minValue = Math.min(minValue, threshold);
    maxValue = Math.max(maxValue, threshold);
  }

  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const padding = { top: 14, right: 12, bottom: 20, left: 52 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;
  const toY = (value) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  context.strokeStyle = "rgba(104, 136, 168, 0.28)";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = padding.top + (chartHeight / 4) * tick;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + chartWidth, y);
    context.stroke();

    const labelValue = maxValue - ((maxValue - minValue) / 4) * tick;
    context.fillStyle = "#6f87a0";
    context.font = "600 11px 'Segoe UI', sans-serif";
    context.fillText(labelValue.toFixed(1), 8, y + 4);
  }

  if (Number.isFinite(threshold)) {
    const thresholdY = toY(threshold);
    context.save();
    context.setLineDash([7, 5]);
    context.strokeStyle = "rgba(218, 89, 89, 0.88)";
    context.beginPath();
    context.moveTo(padding.left, thresholdY);
    context.lineTo(padding.left + chartWidth, thresholdY);
    context.stroke();
    context.restore();

    context.fillStyle = "#c44747";
    context.font = "700 11px 'Segoe UI', sans-serif";
    context.fillText("threshold", padding.left + 8, Math.max(12, thresholdY - 7));
  }

  context.strokeStyle = "#2f78b7";
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((point, index) => {
    const x =
      points.length === 1
        ? padding.left
        : padding.left + (chartWidth * index) / (points.length - 1);
    const y = toY(point.value);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  if (Number.isFinite(threshold) && Array.isArray(axisData.highAlerts) && axisData.highAlerts.length) {
    const maxIndex = Math.max(1, rawValues.length - 1);
    context.fillStyle = "#da5959";
    axisData.highAlerts.forEach((alert) => {
      const x = padding.left + (chartWidth * Number(alert.index || 0)) / maxIndex;
      const y = toY(Number(alert.value || 0));
      context.beginPath();
      context.arc(x, y, 3.2, 0, Math.PI * 2);
      context.fill();
    });
  }
}

function createAxisChart(axisLabel, axisData) {
  const panel = document.createElement("div");
  panel.className = "received-axis-chart";

  const head = document.createElement("div");
  head.className = "received-axis-chart-head";

  const title = document.createElement("span");
  title.className = "received-axis-chart-title";
  title.textContent = `${axisLabel} Data Chart`;

  const meta = document.createElement("span");
  meta.className = "received-axis-chart-meta";
  meta.textContent =
    `${axisData.count} pts | min ${formatViewerNumber(axisData.min)} | max ${formatViewerNumber(axisData.max)}`;

  const canvas = document.createElement("canvas");
  canvas.className = "received-axis-canvas";
  canvas.setAttribute("aria-label", `${axisLabel} axis chart`);

  head.append(title, meta);
  panel.append(head, canvas);

  requestAnimationFrame(() => {
    drawAxisChart(canvas, axisData);
  });

  return panel;
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
  section.append(alertText);

  if (!axisData.highCount || !Array.isArray(axisData.highAlerts) || !axisData.highAlerts.length) {
    alertText.textContent = "No high-value alerts.";
    section.append(createAxisChart(axisLabel, axisData));
    return section;
  }

  alertText.textContent = `Top ${axisData.highAlerts.length} high-value alerts:`;

  const alerts = document.createElement("ul");
  alerts.className = "received-viewer-alerts";
  axisData.highAlerts.forEach((entry) => {
    const line = document.createElement("li");
    line.textContent = `idx ${entry.index} = ${entry.value}`;
    alerts.append(line);
  });
  section.append(alerts, createAxisChart(axisLabel, axisData));

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
bindReadyCheckWifi();
bindTransferLauncher();
