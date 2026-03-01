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

function formatTransferOutput(result) {
  const output = [];

  if (result.command) {
    output.push(`> ${result.command}`);
  }

  if (result.stdout) {
    output.push(result.stdout.trim());
  }

  if (result.stderr) {
    output.push(result.stderr.trim());
  }

  return output.filter(Boolean).join("\n\n") || "No output returned.";
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
  renderTransferMode(modeKey);
  transferButton.disabled = true;
  udpTransferButton.disabled = true;
  transferActionStatus.textContent = mode.runningText;
  transferLog.textContent = mode.launchLabel;

  try {
    const result =
      modeKey === "udp"
        ? await window.appApi.filetransfer.startUdp(selectedDate)
        : await window.appApi.filetransfer.start(selectedDate);
    transferLog.textContent = formatTransferOutput(result);
    transferActionStatus.textContent = result.ok ? mode.successText : mode.failText;
  } catch (error) {
    transferActionStatus.textContent = "Transfer launch failed before the receiver started.";
    transferLog.textContent = error && error.message ? error.message : String(error);
    console.error(error);
  } finally {
    transferButton.disabled = false;
    udpTransferButton.disabled = false;
  }
}

function bindTransferLauncher() {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  if (!transferDateInput.value) {
    transferDateInput.value = getDefaultTransferDate();
  }

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
