# Code Metrics

This project records a fixed code-scale snapshot from `metrics/config.json`.

Tracked metrics:

- `累计变更行数`: source-file additions plus deletions from the project baseline
- `累计写入行数`: source-file additions from the project baseline
- `删除代码行数`: source-file deletions from the project baseline
- `当前总行数`: current line count across tracked source files
- `新增/调整功能次数`: commit counts based on conventional prefixes
- `主要源码行数信息`: per-file line counts and top source files

Tracked source files:

- `.js`
- `.html`
- `.css`
- `.py`

Commands:

- `npm run metrics`: calculate and print the current snapshot
- `npm run metrics:record`: calculate, print, and write `metrics/latest.json` plus append one line to `metrics/history.jsonl`

Output files:

- `metrics/latest.json`: latest full snapshot
- `metrics/history.jsonl`: append-only snapshot history
