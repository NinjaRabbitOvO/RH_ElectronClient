const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = process.cwd();
const METRICS_DIR = path.join(ROOT_DIR, "metrics");
const CONFIG_PATH = path.join(METRICS_DIR, "config.json");
const LATEST_PATH = path.join(METRICS_DIR, "latest.json");
const HISTORY_PATH = path.join(METRICS_DIR, "history.jsonl");
const SOURCE_PATTERN = /\.(js|html|css|py)$/i;
const ADJUSTMENT_PREFIXES = ["fix", "refactor", "style"];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryRunGit(args) {
  try {
    return runGit(args);
  } catch (error) {
    return null;
  }
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function getTrackedSourceFiles() {
  const output = runGit(["ls-files"]);

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => SOURCE_PATTERN.test(entry));
}

function countLinesFromText(content) {
  if (!content) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

function countWorkingTreeLines(filePath) {
  const absolutePath = path.join(ROOT_DIR, filePath);

  if (!fs.existsSync(absolutePath)) {
    return 0;
  }

  return countLinesFromText(fs.readFileSync(absolutePath, "utf8"));
}

function countIndexLines(filePath) {
  const content = tryRunGit(["show", `:${filePath}`]);

  if (content === null) {
    return 0;
  }

  return countLinesFromText(content);
}

function parseDiffStatsFromOutput(output) {
  if (!output) {
    return {
      changedFiles: 0,
      writtenLines: 0,
      deletedLines: 0,
      changeLines: 0,
    };
  }

  let changedFiles = 0;
  let writtenLines = 0;
  let deletedLines = 0;

  output.split(/\r?\n/).forEach((line) => {
    if (!line) {
      return;
    }

    const parts = line.split("\t");
    if (parts.length < 3) {
      return;
    }

    const filePath = parts[2].trim();
    if (!SOURCE_PATTERN.test(filePath)) {
      return;
    }

    const added = Number(parts[0]);
    const removed = Number(parts[1]);

    if (!Number.isFinite(added) || !Number.isFinite(removed)) {
      return;
    }

    changedFiles += 1;
    writtenLines += added;
    deletedLines += removed;
  });

  return {
    changedFiles,
    writtenLines,
    deletedLines,
    changeLines: writtenLines + deletedLines,
  };
}

function parseDiffStats(rangeSpec) {
  return parseDiffStatsFromOutput(runGit(["diff", "--numstat", rangeSpec]));
}

function parseStagedDiffStats() {
  return parseDiffStatsFromOutput(runGit(["diff", "--cached", "--numstat"]));
}

function addDiffStats(left, right) {
  return {
    changedFiles: left.changedFiles + right.changedFiles,
    writtenLines: left.writtenLines + right.writtenLines,
    deletedLines: left.deletedLines + right.deletedLines,
    changeLines: left.changeLines + right.changeLines,
  };
}

function classifyCommitMessage(message) {
  const normalized = String(message || "").trim().toLowerCase();
  const result = {
    totalCommitCount: normalized ? 1 : 0,
    featureCommitCount: 0,
    adjustmentCommitCount: 0,
  };

  if (!normalized) {
    return result;
  }

  if (normalized.startsWith("feat:") || normalized.startsWith("feat(")) {
    result.featureCommitCount = 1;
    return result;
  }

  if (
    ADJUSTMENT_PREFIXES.some(
      (prefix) =>
        normalized.startsWith(`${prefix}:`) || normalized.startsWith(`${prefix}(`),
    )
  ) {
    result.adjustmentCommitCount = 1;
  }

  return result;
}

function addCommitCounts(left, right) {
  return {
    totalCommitCount: left.totalCommitCount + right.totalCommitCount,
    featureCommitCount: left.featureCommitCount + right.featureCommitCount,
    adjustmentCommitCount: left.adjustmentCommitCount + right.adjustmentCommitCount,
  };
}

function readCommitMessageSummary(messageFilePath) {
  if (!messageFilePath) {
    return "";
  }

  const absolutePath = path.isAbsolute(messageFilePath)
    ? messageFilePath
    : path.join(ROOT_DIR, messageFilePath);

  if (!fs.existsSync(absolutePath)) {
    return "";
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || "";
}

function parseArgs(argv) {
  const options = {
    record: false,
    includeStaged: false,
    commitMsgFile: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--record") {
      options.record = true;
      continue;
    }

    if (token === "--include-staged") {
      options.includeStaged = true;
      continue;
    }

    if (token === "--commit-msg-file") {
      options.commitMsgFile = argv[index + 1] || "";
      index += 1;
    }
  }

  return options;
}

function parseCommitCounts(rangeSpec) {
  const output = runGit(["log", "--format=%s", rangeSpec]);
  const messages = output ? output.split(/\r?\n/).filter(Boolean) : [];

  let featureCommitCount = 0;
  let adjustmentCommitCount = 0;

  messages.forEach((message) => {
    const normalized = message.trim().toLowerCase();

    if (normalized.startsWith("feat:") || normalized.startsWith("feat(")) {
      featureCommitCount += 1;
      return;
    }

    if (
      ADJUSTMENT_PREFIXES.some(
        (prefix) =>
          normalized.startsWith(`${prefix}:`) || normalized.startsWith(`${prefix}(`),
      )
    ) {
      adjustmentCommitCount += 1;
    }
  });

  return {
    totalCommitCount: messages.length,
    featureCommitCount,
    adjustmentCommitCount,
  };
}

function buildRangeMetrics(baseCommit) {
  const rangeSpec = `${baseCommit}..HEAD`;
  const diffStats = parseDiffStats(rangeSpec);
  const commitCounts = parseCommitCounts(rangeSpec);

  return {
    baselineCommit: baseCommit,
    ...diffStats,
    ...commitCounts,
  };
}

function buildRangeMetricsWithOptions(baseCommit, options) {
  const baseMetrics = buildRangeMetrics(baseCommit);

  if (!options.includeStaged) {
    return baseMetrics;
  }

  const stagedDiff = parseStagedDiffStats();
  const pendingCommit = classifyCommitMessage(
    readCommitMessageSummary(options.commitMsgFile),
  );

  return {
    baselineCommit: baseMetrics.baselineCommit,
    ...addDiffStats(baseMetrics, stagedDiff),
    ...addCommitCounts(baseMetrics, pendingCommit),
  };
}

function buildSourceBreakdown(options) {
  const files = getTrackedSourceFiles();
  const breakdown = files.map((filePath) => ({
    file: filePath,
    lines: options.includeStaged
      ? countIndexLines(filePath)
      : countWorkingTreeLines(filePath),
  }));

  const bySize = breakdown
    .slice()
    .sort((left, right) => right.lines - left.lines || left.file.localeCompare(right.file));

  const totalLines = breakdown.reduce((sum, entry) => sum + entry.lines, 0);

  return {
    totalLines,
    fileCount: breakdown.length,
    allFiles: breakdown,
    topFiles: bySize.slice(0, 10),
  };
}

function buildSnapshot(options) {
  const config = loadConfig();
  const headCommit = runGit(["rev-parse", "HEAD"]);
  const source = buildSourceBreakdown(options);

  return {
    timestamp: new Date().toISOString(),
    headCommit,
    baselines: {
      projectBaselineCommit: config.projectBaselineCommit,
      trackingStartCommit: config.trackingStartCommit,
      trackingEnabledAt: config.trackingEnabledAt,
    },
    projectTotals: buildRangeMetricsWithOptions(config.projectBaselineCommit, options),
    trackingTotals: buildRangeMetricsWithOptions(config.trackingStartCommit, options),
    currentTotals: {
      totalLines: source.totalLines,
      sourceFileCount: source.fileCount,
    },
    majorSourceFiles: source.topFiles,
    sourceFileBreakdown: source.allFiles,
  };
}

function writeSnapshot(snapshot) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
  fs.writeFileSync(LATEST_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  fs.appendFileSync(HISTORY_PATH, `${JSON.stringify(snapshot)}\n`, "utf8");
}

function printSummary(snapshot) {
  console.log(`Metrics snapshot: ${snapshot.timestamp}`);
  console.log(`HEAD: ${snapshot.headCommit}`);
  console.log(
    `Current source lines: ${snapshot.currentTotals.totalLines} across ${snapshot.currentTotals.sourceFileCount} files`,
  );
  console.log(
    `Project cumulative: +${snapshot.projectTotals.writtenLines} / -${snapshot.projectTotals.deletedLines} / total ${snapshot.projectTotals.changeLines}`,
  );
  console.log(
    `Tracking cumulative: +${snapshot.trackingTotals.writtenLines} / -${snapshot.trackingTotals.deletedLines} / total ${snapshot.trackingTotals.changeLines}`,
  );
  console.log(
    `Feature commits: ${snapshot.projectTotals.featureCommitCount}, adjustment commits: ${snapshot.projectTotals.adjustmentCommitCount}`,
  );
  console.log("Top source files:");

  snapshot.majorSourceFiles.forEach((entry) => {
    console.log(`- ${entry.file}: ${entry.lines}`);
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = buildSnapshot(options);

  printSummary(snapshot);

  if (options.record) {
    writeSnapshot(snapshot);
    console.log(`Recorded metrics to ${path.relative(ROOT_DIR, LATEST_PATH)}`);
  }
}

main();
