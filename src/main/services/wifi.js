const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ESP_SSID_PATTERN = /^ESP(?:32)?-/i;
const DEFAULT_WIFI_INTERFACE_NAMES = [
  "Wi-Fi",
  "WLAN",
  "Wireless Network Connection",
];

function runNetsh(args, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const child = spawn("netsh", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeoutHandle = setTimeout(() => {
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        code: Number(code ?? 1),
        stdout,
        stderr,
      });
    });
  });
}

function normalizeText(text) {
  return String(text || "").replace(/\r/g, "");
}

function extractText(result) {
  return normalizeText(`${result.stdout}\n${result.stderr}`).trim();
}

function isConnectRequestAccepted(text) {
  return /completed successfully|successfully completed|已成功完成|连接请求已完成|请求已完成/i.test(
    String(text || ""),
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseWlanInterfaces(outputText) {
  const lines = normalizeText(outputText).split("\n");
  const interfaces = [];
  let current = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const nameMatch = line.match(/^Name\s*:\s*(.+)$/i);
    if (nameMatch) {
      if (current) {
        interfaces.push(current);
      }
      current = {
        name: nameMatch[1].trim(),
        state: "",
        ssid: "",
        softwareRadioOn: null,
        hardwareRadioOn: null,
      };
      return;
    }

    if (!current) {
      return;
    }

    const stateMatch = line.match(/^State\s*:\s*(.+)$/i);
    if (stateMatch) {
      current.state = stateMatch[1].trim();
      return;
    }

    const ssidMatch = line.match(/^SSID\s*:\s*(.+)$/i);
    if (ssidMatch && !/^BSSID/i.test(line)) {
      current.ssid = ssidMatch[1].trim();
      return;
    }

    const softwareMatch = line.match(/^Software\s+(On|Off)$/i);
    if (softwareMatch) {
      current.softwareRadioOn = softwareMatch[1].toLowerCase() === "on";
      return;
    }

    const hardwareMatch = line.match(/^Hardware\s+(On|Off)$/i);
    if (hardwareMatch) {
      current.hardwareRadioOn = hardwareMatch[1].toLowerCase() === "on";
    }
  });

  if (current) {
    interfaces.push(current);
  }

  return interfaces;
}

function parseWifiNamesFromInterfaceTable(outputText) {
  const lines = normalizeText(outputText).split("\n");
  const names = [];

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || /^Admin State/i.test(line) || /^-+$/.test(line)) {
      return;
    }

    const match = line.match(/^(Enabled|Disabled)\s+\S+\s+\S+\s+(.+)$/i);
    if (!match) {
      return;
    }

    const interfaceName = match[2].trim();
    if (/wi-?fi|wlan|wireless/i.test(interfaceName)) {
      names.push(interfaceName);
    }
  });

  return names;
}

function parseNetworks(outputText) {
  const lines = normalizeText(outputText).split("\n");
  const networks = [];
  let current = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const ssidMatch = line.match(/^SSID\s+\d+\s*:\s*(.*)$/i);
    if (ssidMatch) {
      const ssid = ssidMatch[1].trim();
      current = {
        ssid,
        signal: 0,
      };
      if (ssid) {
        networks.push(current);
      }
      return;
    }

    if (!current) {
      return;
    }

    const signalMatch = line.match(/^Signal\s*:\s*(\d+)%$/i);
    if (signalMatch) {
      current.signal = Number(signalMatch[1]);
    }
  });

  const unique = new Map();
  networks.forEach((network) => {
    if (!network.ssid) {
      return;
    }

    const existing = unique.get(network.ssid);
    if (!existing || network.signal > existing.signal) {
      unique.set(network.ssid, network);
    }
  });

  return Array.from(unique.values());
}

function isEspSsid(ssid) {
  return ESP_SSID_PATTERN.test(String(ssid || "").trim());
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createWpa2ProfileXml(ssid, password) {
  const safeSsid = escapeXml(ssid);
  const safePassword = escapeXml(password);

  return `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${safeSsid}</name>
  <SSIDConfig>
    <SSID>
      <name>${safeSsid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>manual</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${safePassword}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>`;
}

function isPermissionError(text) {
  return /access is denied|requires elevation|administrator|permission denied/i.test(
    String(text || ""),
  );
}

async function enableCandidateInterfaces(candidates) {
  const errors = [];
  let permissionDenied = false;

  for (const name of candidates) {
    const response = await runNetsh([
      "interface",
      "set",
      "interface",
      `name="${name}"`,
      "admin=enabled",
    ]);
    if (response.code === 0) {
      return {
        ok: true,
        requestedEnable: true,
        permissionDenied: false,
        message: `Enabled interface: ${name}`,
      };
    }

    const errorText = extractText(response);
    if (isPermissionError(errorText)) {
      permissionDenied = true;
    }
    errors.push(`${name}: ${errorText || "unknown error"}`);
  }

  return {
    ok: false,
    requestedEnable: candidates.length > 0,
    permissionDenied,
    message: errors.join(" | "),
  };
}

async function ensureWifiEnabledIfNeeded() {
  const interfaceResult = await runNetsh(["wlan", "show", "interfaces"]);
  const interfaces = parseWlanInterfaces(interfaceResult.stdout);

  const hasUsableInterface = interfaces.some((item) => item.name);
  const hasSoftwareOff = interfaces.some((item) => item.softwareRadioOn === false);
  if (hasUsableInterface && !hasSoftwareOff) {
    return {
      requestedEnable: false,
      permissionDenied: false,
      interfaces,
      message: "",
    };
  }

  const tableResult = await runNetsh(["interface", "show", "interface"]);
  const tableCandidates = parseWifiNamesFromInterfaceTable(tableResult.stdout);
  const interfaceCandidates = interfaces.map((item) => item.name).filter(Boolean);
  const candidates = Array.from(
    new Set([...interfaceCandidates, ...tableCandidates, ...DEFAULT_WIFI_INTERFACE_NAMES]),
  );

  const enableResult = await enableCandidateInterfaces(candidates);
  const retryResult = await runNetsh(["wlan", "show", "interfaces"]);

  return {
    requestedEnable: enableResult.requestedEnable,
    permissionDenied: enableResult.permissionDenied,
    interfaces: parseWlanInterfaces(retryResult.stdout),
    message: enableResult.message || extractText(retryResult),
  };
}

function ensureWindowsPlatform() {
  if (process.platform !== "win32") {
    return {
      ok: false,
      error: "Wi-Fi scanning and direct connection are currently supported on Windows only.",
    };
  }

  return { ok: true };
}

async function verifyConnectedSsid(ssid, retries = 6, delayMs = 650) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const interfacesResult = await runNetsh(["wlan", "show", "interfaces"]);
    const interfaces = parseWlanInterfaces(interfacesResult.stdout);
    const matched = interfaces.find((item) => item.ssid === ssid);
    if (matched) {
      return true;
    }

    if (attempt < retries - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

async function connectUsingProfile(ssid) {
  const connectResult = await runNetsh([
    "wlan",
    "connect",
    `name="${ssid}"`,
    `ssid="${ssid}"`,
  ]);
  const connectText = extractText(connectResult);
  const requestAccepted = isConnectRequestAccepted(connectText);

  if (connectResult.code !== 0) {
    return {
      ok: false,
      error: connectText || `Failed to connect to ${ssid}.`,
    };
  }

  const connected = await verifyConnectedSsid(ssid, 14, 700);
  if (!connected) {
    if (requestAccepted) {
      return {
        ok: true,
        ssid,
        pending: true,
        message: `Connection request for ${ssid} was accepted. Waiting for final association.`,
      };
    }

    return {
      ok: false,
      error:
        connectText
        || `Connection command returned but ${ssid} was not confirmed.`,
    };
  }

  return {
    ok: true,
    ssid,
  };
}

async function scanEspWifiNetworks() {
  const platform = ensureWindowsPlatform();
  if (!platform.ok) {
    return platform;
  }

  try {
    const enableState = await ensureWifiEnabledIfNeeded();
    const scanResult = await runNetsh(["wlan", "show", "networks", "mode=bssid"]);

    if (scanResult.code !== 0) {
      return {
        ok: false,
        requestedEnable: enableState.requestedEnable,
        permissionDenied: enableState.permissionDenied,
        error: extractText(scanResult) || "Failed to scan nearby Wi-Fi networks.",
      };
    }

    const allNetworks = parseNetworks(scanResult.stdout);
    const espNetworks = allNetworks
      .filter((network) => isEspSsid(network.ssid))
      .sort((left, right) => right.signal - left.signal);

    return {
      ok: true,
      requestedEnable: enableState.requestedEnable,
      permissionDenied: enableState.permissionDenied,
      message: enableState.message,
      networks: espNetworks,
      bestNetwork: espNetworks[0] || null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : "Unexpected Wi-Fi scan error.",
    };
  }
}

async function connectWithPassword(ssid, password) {
  const profilePath = path.join(
    os.tmpdir(),
    `rh-electron-wifi-${Date.now()}-${Math.random().toString(16).slice(2)}.xml`,
  );

  try {
    await runNetsh(["wlan", "delete", "profile", `name="${ssid}"`], 8000);
    fs.writeFileSync(profilePath, createWpa2ProfileXml(ssid, password), "utf8");

    const addProfile = await runNetsh([
      "wlan",
      "add",
      "profile",
      `filename="${profilePath}"`,
      "user=current",
    ]);
    if (addProfile.code !== 0) {
      return {
        ok: false,
        error: extractText(addProfile) || "Failed to add Wi-Fi profile.",
      };
    }

    const connectResult = await connectUsingProfile(ssid);
    if (!connectResult.ok) {
      return connectResult;
    }

    return {
      ok: true,
      ssid,
      usedSavedProfile: false,
      message: `Connected to ${ssid} with the provided password.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : "Unexpected Wi-Fi connection error.",
    };
  } finally {
    try {
      if (fs.existsSync(profilePath)) {
        fs.unlinkSync(profilePath);
      }
    } catch (_error) {
    }
  }
}

async function connectEspWifi(request) {
  const platform = ensureWindowsPlatform();
  if (!platform.ok) {
    return platform;
  }

  const ssid = request && typeof request.ssid === "string" ? request.ssid.trim() : "";
  const password = request && typeof request.password === "string" ? request.password.trim() : "";
  if (!ssid) {
    return {
      ok: false,
      error: "SSID is required for Wi-Fi connection.",
    };
  }

  const enableState = await ensureWifiEnabledIfNeeded();
  if (enableState.permissionDenied) {
    return {
      ok: false,
      requestedEnable: enableState.requestedEnable,
      permissionDenied: true,
      error:
        "Unable to enable Wi-Fi adapter due to permission restrictions. Please run the app with sufficient privileges.",
    };
  }

  if (!password) {
    const savedResult = await connectUsingProfile(ssid);
    if (savedResult.ok) {
      return {
        ok: true,
        ssid,
        usedSavedProfile: true,
        message:
          savedResult.message
          || `Connected to ${ssid} using saved credentials.`,
      };
    }

    const rawError = savedResult.error || "";
    const shouldAskPassword = /no profile|cannot find|not found|找不到|配置文件|身份验证|authentication|密码|password/i.test(
      rawError,
    );
    return {
      ok: false,
      ssid,
      usedSavedProfile: true,
      error: shouldAskPassword
        ? `${rawError || "No saved credentials found."} Please enter a password and retry.`
        : rawError || "Failed to connect using saved credentials.",
    };
  }

  return connectWithPassword(ssid, password);
}

module.exports = {
  scanEspWifiNetworks,
  connectEspWifi,
};
