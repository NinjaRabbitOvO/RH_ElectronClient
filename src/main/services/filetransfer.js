const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const TCP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "PlusWifi_Client.py");
const UDP_SCRIPT_PATH = path.join(__dirname, "..", "..", "..", "udp_file_client.py");
const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000;

function normalizeDateInput(value) {
  if (typeof value !== "string") {
    throw new Error("A transfer date is required.");
  }

  const normalized = value.replace(/-/g, "").trim();

  if (!/^\d{8}$/.test(normalized)) {
    throw new Error("Transfer date must be in YYYYMMDD or YYYY-MM-DD format.");
  }

  return normalized;
}

async function tryExecute(command, args) {
  return execFileAsync(command, args, {
    cwd: path.dirname(TCP_SCRIPT_PATH),
    encoding: "utf8",
    timeout: EXECUTION_TIMEOUT_MS,
    windowsHide: true,
  });
}

async function runScript(scriptPath, dateText) {
  const transferDate = normalizeDateInput(dateText);
  const attempts = [
    { command: "py", args: ["-3", scriptPath, transferDate] },
    { command: "python", args: [scriptPath, transferDate] },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const result = await tryExecute(attempt.command, attempt.args);

      return {
        ok: true,
        transferDate,
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        command: [attempt.command, ...attempt.args].join(" "),
      };
    } catch (error) {
      lastError = error;

      if (error.code === "ENOENT") {
        continue;
      }

      return {
        ok: false,
        transferDate,
        stdout: error.stdout || "",
        stderr: error.stderr || error.message || "",
        command: [attempt.command, ...attempt.args].join(" "),
      };
    }
  }

  return {
    ok: false,
    transferDate,
    stdout: "",
    stderr: lastError ? lastError.message || "Python launcher not found." : "Python launcher not found.",
    command: "",
  };
}

async function runPythonTransfer(dateText) {
  return runScript(TCP_SCRIPT_PATH, dateText);
}

async function runUdpTransfer(dateText) {
  return runScript(UDP_SCRIPT_PATH, dateText);
}

module.exports = {
  runPythonTransfer,
  runUdpTransfer,
};
