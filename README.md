# Client App

Electron Forge based desktop client for the HR Engry Lab project.

## Requirements

- Node.js 20+
- npm

## Project Structure

```text
src/
  main/        # Electron main process
  preload/     # Context bridge for renderer access
  renderer/    # HTML/CSS/JS for the desktop UI
  shared/      # Shared constants between processes
```

## Development

```bash
npm install
npm start
```

## Packaging

```bash
npm run package
npm run make
```

## Git

- Default branch: `main`
- Commit source files and lockfile
- Do not commit `node_modules/` or packaged output
