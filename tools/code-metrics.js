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

function countLines(filePath) {
  const absolutePath = path.join(ROOT_DIR, filePath);

  if (!fs.existsSync(absolutePath)) {
    return 0;
  }

  const content = fs.readFileSync(absolutePath, "utf8");

  if (!content) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

function parseDiffStats(rangeSpec) {
  const output = runGit(["diff", "--numstat", rangeSpec]);

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

function buildSourceBreakdown() {
  const files = getTrackedSourceFiles();
  const breakdown = files.map((filePath) => ({
    file: filePath,
    lines: countLines(filePath),
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

function buildSnapshot() {
  const config = loadConfig();
  const headCommit = runGit(["rev-parse", "HEAD"]);
  const source = buildSourceBreakdown();

  return {
    timestamp: new Date().toISOString(),
    headCommit,
    baselines: {
      projectBaselineCommit: config.projectBaselineCommit,
      trackingStartCommit: config.trackingStartCommit,
      trackingEnabledAt: config.trackingEnabledAt,
    },
    projectTotals: buildRangeMetrics(config.projectBaselineCommit),
    trackingTotals: buildRangeMetrics(config.trackingStartCommit),
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
  const shouldRecord = process.argv.includes("--record");
  const snapshot = buildSnapshot();

  printSummary(snapshot);

  if (shouldRecord) {
    writeSnapshot(snapshot);
    console.log(`Recorded metrics to ${path.relative(ROOT_DIR, LATEST_PATH)}`);
  }
}

main();
