const fs = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");
const TCP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "PlusWifi_Client.py");
const UDP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "udp_file_client.py");
const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000;
const { IPC_CHANNELS } = require("../../shared/ipc");
const RECEIVE_DIR_PATTERN = /^(?:(.+)_)?(RE|Re)(\d{8})$/;
const EXAMPLE_DATA_FOLDER_NAME = "ExampleData";
const DEFAULT_TRANSFER_WIFI_NAME = "ESP32-S3";
const DAT_EXTENSION_PATTERN = /\.dat$/i;
const DEFAULT_ANOMALY_SIGMA = 4;
const DEFAULT_ANOMALY_MIN_GAP = 20;
const DEFAULT_ALERT_LIMIT = 8;

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

function formatTransferDate(dateText) {
  return `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`;
}

function normalizeWifiName(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function sanitizeWifiName(value) {
  const raw = normalizeWifiName(value) || DEFAULT_TRANSFER_WIFI_NAME;
  return raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || DEFAULT_TRANSFER_WIFI_NAME;
}

function parseReceiveFolderName(folderName) {
  const match = folderName.match(RECEIVE_DIR_PATTERN);
  if (!match) {
    return null;
  }

  const wifiName = normalizeWifiName(match[1]) || DEFAULT_TRANSFER_WIFI_NAME;
  const protocolToken = match[2];
  const dateCode = match[3];

  return {
    wifiName,
    protocolHint: protocolToken === "RE" ? "TCP" : "UDP",
    dateCode,
  };
}

function listFolderFiles(folderPath) {
  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((item) => item.isFile())
    .map((item) => {
      const absolutePath = path.join(folderPath, item.name);
      const { size } = fs.statSync(absolutePath);

      return {
        name: item.name,
        size,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function resolveExampleDataPath(rootDirectory) {
  const localPath = path.join(rootDirectory, EXAMPLE_DATA_FOLDER_NAME);
  if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
    return localPath;
  }

  const packagedPath = path.join(process.resourcesPath, EXAMPLE_DATA_FOLDER_NAME);
  if (fs.existsSync(packagedPath) && fs.statSync(packagedPath).isDirectory()) {
    return packagedPath;
  }

  return "";
}

function readUInt32LE(buffer, offset, label) {
  if (offset + 4 > buffer.length) {
    throw new Error(`${label} is truncated at offset ${offset}.`);
  }
  return buffer.readUInt32LE(offset);
}

function readFloatLE(buffer, offset, label) {
  if (offset + 4 > buffer.length) {
    throw new Error(`${label} is truncated at offset ${offset}.`);
  }
  return buffer.readFloatLE(offset);
}

function readInt16Values(buffer, offset, count, label) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`${label} has invalid count: ${count}.`);
  }

  const bytes = count * 2;
  if (offset + bytes > buffer.length) {
    throw new Error(
      `${label} is truncated: need ${bytes} bytes at offset ${offset}, `
      + `but file size is ${buffer.length} bytes.`,
    );
  }

  const values = new Array(count);
  for (let index = 0; index < count; index += 1) {
    values[index] = buffer.readInt16LE(offset + index * 2);
  }

  return {
    values,
    nextOffset: offset + bytes,
  };
}

function padNumber(value, length = 2) {
  return String(value).padStart(length, "0");
}

function formatUtc(year, month, day, hour, minute) {
  return `${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)}:${padNumber(hour, 2)}:${padNumber(minute, 2)}`;
}

function summarizeSeries(values) {
  if (!values.length) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      std: 0,
    };
  }

  let min = values[0];
  let max = values[0];
  let sum = 0;

  values.forEach((value) => {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
    sum += value;
  });

  const mean = sum / values.length;
  let varianceSum = 0;
  values.forEach((value) => {
    const delta = value - mean;
    varianceSum += delta * delta;
  });
  const std = Math.sqrt(varianceSum / values.length);

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    count: values.length,
    min,
    max,
    mean,
    median,
    std,
  };
}

function summarizeAxis(values) {
  const stats = summarizeSeries(values);
  const threshold = Math.max(
    stats.mean + Math.max(DEFAULT_ANOMALY_MIN_GAP, DEFAULT_ANOMALY_SIGMA * stats.std),
    stats.median + Math.max(DEFAULT_ANOMALY_MIN_GAP, DEFAULT_ANOMALY_SIGMA * stats.std),
  );

  const alerts = [];
  values.forEach((value, index) => {
    if (value > threshold) {
      alerts.push({ index, value });
    }
  });
  alerts.sort((left, right) => right.value - left.value);

  return {
    ...stats,
    threshold,
    highCount: alerts.length,
    highAlerts: alerts.slice(0, DEFAULT_ALERT_LIMIT),
  };
}

function resolveReceivedFolderPath(rootDirectory, folderName) {
  if (folderName === EXAMPLE_DATA_FOLDER_NAME) {
    const examplePath = resolveExampleDataPath(rootDirectory);
    if (!examplePath) {
      throw new Error("ExampleData folder is unavailable.");
    }
    return examplePath;
  }

  if (!parseReceiveFolderName(folderName)) {
    throw new Error("Unsupported folder name.");
  }

  const folderPath = path.join(rootDirectory, folderName);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error("Requested receive folder does not exist.");
  }

  return folderPath;
}

function parseDatFile(folderName, fileName) {
  const rootDirectory = path.dirname(TCP_SCRIPT_PATH);

  if (typeof folderName !== "string" || !folderName.trim()) {
    throw new Error("folderName is required.");
  }

  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new Error("fileName is required.");
  }

  if (path.basename(fileName) !== fileName) {
    throw new Error("Invalid fileName.");
  }

  if (!DAT_EXTENSION_PATTERN.test(fileName)) {
    throw new Error("Only .dat files are supported.");
  }

  const folderPath = resolveReceivedFolderPath(rootDirectory, folderName);
  const filePath = path.join(folderPath, fileName);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error("Requested .dat file does not exist.");
  }

  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 72) {
    throw new Error("File is too short for the expected header format.");
  }

  const separator = readUInt32LE(buffer, 0, "separator");
  const year = readUInt32LE(buffer, 4, "UTC year");
  const month = readUInt32LE(buffer, 8, "UTC month");
  const day = readUInt32LE(buffer, 12, "UTC day");
  const hour = readUInt32LE(buffer, 16, "UTC hour");
  const minute = readUInt32LE(buffer, 20, "UTC minute");
  const latitude = readFloatLE(buffer, 24, "latitude");
  const longitude = readFloatLE(buffer, 28, "longitude");
  const timezone = readUInt32LE(buffer, 32, "UTC zone");
  const temp1 = readFloatLE(buffer, 36, "TEMP1");
  const temp2 = readFloatLE(buffer, 40, "TEMP2");
  const humTemp = readFloatLE(buffer, 44, "HUM_TEMP");
  const hum = readFloatLE(buffer, 48, "HUM");
  const water = readFloatLE(buffer, 52, "Water");
  const capacitorV = readUInt32LE(buffer, 56, "Capacitor_V");
  const batV = readUInt32LE(buffer, 60, "Bat_v");

  const utcFormatted = formatUtc(year, month, day, hour, minute);
  const utcLine = `UTC ${utcFormatted} | TimeZone ${timezone} | Lat ${latitude.toFixed(6)} | Lon ${longitude.toFixed(6)}`;

  let sampleSize = 0;
  let startTimestamp = 0;
  let sampleSize2 = 0;
  let axis = null;
  let track = null;
  let trailingBytes = 0;

  if (separator === 0xff) {
    sampleSize = readUInt32LE(buffer, 64, "Sample_Size");
    startTimestamp = readUInt32LE(buffer, 68, "Start_Timestamp");

    let offset = 72;
    const xSeries = readInt16Values(buffer, offset, sampleSize, "X list");
    offset = xSeries.nextOffset;
    const ySeries = readInt16Values(buffer, offset, sampleSize, "Y list");
    offset = ySeries.nextOffset;
    const zSeries = readInt16Values(buffer, offset, sampleSize, "Z list");
    offset = zSeries.nextOffset;

    axis = {
      x: {
        ...summarizeAxis(xSeries.values),
        values: xSeries.values,
      },
      y: {
        ...summarizeAxis(ySeries.values),
        values: ySeries.values,
      },
      z: {
        ...summarizeAxis(zSeries.values),
        values: zSeries.values,
      },
    };

    sampleSize2 = readUInt32LE(buffer, offset, "Sample_Size2");
    offset += 4;
    const trackSeries = readInt16Values(buffer, offset, sampleSize2, "Track_return_voltage list");
    offset = trackSeries.nextOffset;
    track = {
      ...summarizeAxis(trackSeries.values),
      values: trackSeries.values,
    };

    trailingBytes = Math.max(0, buffer.length - offset);
  }

  return {
    ok: true,
    data: {
      file: {
        folderName,
        fileName,
        absolutePath: filePath,
        sizeBytes: buffer.length,
      },
      header: {
        separator,
        utc: {
          year,
          month,
          day,
          hour,
          minute,
          formatted: utcFormatted,
        },
        timezone,
        latitude,
        longitude,
        utcLine,
      },
      sensors: {
        temp1,
        temp2,
        humTemp,
        hum,
        water,
        capacitorV,
        batV,
      },
      sampling: {
        sampleSize,
        startTimestamp,
        sampleSize2,
        trailingBytes,
      },
      axis,
      track,
    },
  };
}

function readReceivedDatFile(request) {
  try {
    if (!request || typeof request !== "object") {
      throw new Error("Invalid read request.");
    }

    return parseDatFile(request.folderName, request.fileName);
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : "Failed to parse .dat file.",
    };
  }
}

function listReceivedTransfers() {
  const rootDirectory = path.dirname(TCP_SCRIPT_PATH);
  const folders = [];
  const entries = fs.existsSync(rootDirectory)
    ? fs.readdirSync(rootDirectory, { withFileTypes: true })
    : [];

  entries.forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }

    const parsedFolder = parseReceiveFolderName(entry.name);
    if (!parsedFolder) {
      return;
    }

    const folderPath = path.join(rootDirectory, entry.name);
    const files = listFolderFiles(folderPath);

    const dateCode = parsedFolder.dateCode;

    folders.push({
      folderName: entry.name,
      dateCode,
      dateLabel: formatTransferDate(dateCode),
      protocolHint: parsedFolder.protocolHint,
      wifiName: parsedFolder.wifiName,
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      files,
      isSpecial: false,
    });
  });

  folders.sort((left, right) => right.dateCode.localeCompare(left.dateCode));

  const exampleDataPath = resolveExampleDataPath(rootDirectory);
  if (exampleDataPath) {
    const files = listFolderFiles(exampleDataPath);

    folders.push({
      folderName: EXAMPLE_DATA_FOLDER_NAME,
      dateCode: "",
      dateLabel: EXAMPLE_DATA_FOLDER_NAME,
      protocolHint: "Example",
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      files,
      isSpecial: true,
    });
  }

  return {
    ok: true,
    folders,
  };
}

function launchTransferProcess(webContents, mode, scriptPath, dateText, wifiName = "") {
  const transferDate = normalizeDateInput(dateText);
  const rootDirectory = path.dirname(TCP_SCRIPT_PATH);
  const selectedWifiName = sanitizeWifiName(wifiName);

  if (activeTransfer) {
    return {
      ok: false,
      started: false,
      transferDate,
      error: "Another transfer is already running.",
    };
  }

  const boundWifiName = selectedWifiName;
  const args = ["-3", "-u", scriptPath, transferDate, "--wifi-name", boundWifiName];
  const child = spawn("py", args, {
    cwd: rootDirectory,
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
    wifiName: boundWifiName,
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
  const request =
    typeof dateText === "object" && dateText
      ? dateText
      : { dateText, wifiName: "" };
  return launchTransferProcess(webContents, "tcp", TCP_SCRIPT_PATH, request.dateText, request.wifiName);
}

async function runUdpTransfer(webContents, dateText) {
  const request =
    typeof dateText === "object" && dateText
      ? dateText
      : { dateText, wifiName: "" };
  return launchTransferProcess(webContents, "udp", UDP_SCRIPT_PATH, request.dateText, request.wifiName);
}

module.exports = {
  listReceivedTransfers,
  readReceivedDatFile,
  runPythonTransfer,
  runUdpTransfer,
};
