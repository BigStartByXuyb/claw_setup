# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenClaw Installer** is an Electron-based desktop application for installing and managing OpenClaw (a multi-channel AI assistant gateway). It provides a wizard-style installation flow and a dashboard for monitoring and configuration.

**Tech stack**: Electron 25 + React 18 + TypeScript 5 + electron-builder

## Essential Commands

```bash
# Development
npm run dev                    # Start dev mode (React + Electron concurrently)
npm run react                  # Start React dev server only
npm run electron-dev           # Compile TS and start Electron

# Building
npm run build                  # Build both React and Electron
npm run build:react            # Build React app to build/
npm run build:electron         # Compile TypeScript to dist/

# Type Checking (run before testing)
npx tsc --noEmit               # Check TypeScript types without emitting files
npm run build:electron         # Also validates types during compilation

# Packaging
npm run dist                   # Build and package for Windows (NSIS + portable)
npm run pack                   # Package without building
```

## Architecture

### Dual Build System

This project has **two separate build pipelines**:

1. **React app** (via react-scripts)
   - Source: `src/App.tsx`, `src/components/`, `src/views/`
   - Output: `build/` directory
   - Config: `tsconfig.json`

2. **Electron main/preload** (via tsc)
   - Source: `src/main.ts`, `src/preload.ts`
   - Output: `dist/` directory
   - Config: `tsconfig.electron.json`

### Application Flow

The app has three main views:

1. **LaunchScreen** - Shown when OpenClaw is already installed
   - Options: Dashboard, Reinstall, Open Chat

2. **InstallerView** - 4-step installation wizard
   - Step 1: System verification (OS, architecture)
   - Step 2: Dependency checking (node, npm, git, pnpm)
   - Step 3: Installation method (prebuilt vs source)
   - Step 4: Channel configuration

3. **DashboardView** - Management interface
   - Gateway monitoring and control
   - Configuration editing (channels, models)
   - Log viewing

### IPC Communication

Main process (`src/main.ts`) exposes these IPC handlers:

**System & Dependencies:**
- `check-system-info` - OS/architecture validation
- `check-dependencies` - Check required tools (returns `{ required, optional, envVars }`)
- `install-tool` - Auto-install tools (currently only pnpm)

**Installation:**
- `install-openclaw` - Install OpenClaw (prebuilt or source)
- `configure-channels` - Configure messaging channels
- `generate-guide` - Generate usage guide

**Gateway Management:**
- `start-gateway` - Start OpenClaw gateway process
- `stop-gateway` - Stop gateway process
- `get-gateway-status` - Check if gateway is running
- `get-gateway-logs` - Retrieve gateway logs
- `open-chat-window` - Open web UI in browser

**Configuration:**
- `load-config` - Load OpenClaw config from `~/.openclaw/openclaw.json`
- `save-config` - Save config changes
- `get-current-model` - Get primary model
- `get-available-models` - List available models from providers
- `set-primary-model` - Set primary model

### Key Implementation Details

**Install Lock Mechanism** (`src/main.ts:13`)
- Uses `Map<string, boolean>` to prevent concurrent installations
- Always check lock before installing, release in finally block

**Gateway Process Management** (`src/main.ts:82-86`)
- Gateway runs as child process (`gatewayProcess`)
- Logs stored in memory (`gatewayLogs`) and file (`~/.openclaw/installer-gateway.log`)
- Port detection via `isPortInUse()` and `findProcessByPort()`

**Dependency Checking** (`src/components/StepTwo.tsx`)
- Distinguishes between required (node, npm, git, pnpm) and optional dependencies
- Auto-install only available for pnpm (via `npm install -g pnpm`)
- Uses `encoding: 'utf8'` and `LANG: 'en_US.UTF-8'` to avoid Windows encoding issues

**Configuration Management** (`src/components/dashboard/ConfigPanel.tsx`)
- Reads/writes `~/.openclaw/openclaw.json`
- Supports channel enable/disable, model provider management
- Primary model selection from available providers

## Development Workflow

### Type Safety First

**ALWAYS verify TypeScript types before testing runtime behavior:**

```bash
# Run type check before any testing
npx tsc --noEmit

# Or use the build command which also validates types
npm run build:electron
```

**Why**: Type errors caught at compile time save hours of runtime debugging. Run type checks after any multi-file changes or when adding new imports.

### Test Before Declaring Done

**After implementing features, ALWAYS verify they work:**

1. Run the application and test the feature
2. Check for runtime errors in console
3. Verify config changes persist correctly
4. Test edge cases and error conditions

**Why**: Many issues only surface at runtime. Testing catches problems like wrong config paths, missing imports, or browser caching before users discover them.

### Minimal Implementation First

**Start with the simplest solution, then iterate if needed:**

- Implement only core functionality without extra abstractions
- No additional features beyond what's requested
- Avoid over-engineering with complex state management
- Keep code changes focused and minimal

**Why**: Simpler code has fewer bugs and is easier to verify. Add complexity only when actually needed.

## Configuration Management

### Config File Path Verification

**Before implementing any config save/load feature:**

1. Search codebase for ALL config file path references
2. Verify read and write operations use the SAME path
3. Check the path exists: `~/.openclaw/openclaw.json`
4. Test both save and load operations after implementation

**Why**: Multiple sessions failed because code read from one path but wrote to another. Always verify path consistency upfront.

### Config Persistence Testing

After any config changes:
```typescript
// 1. Save config
await fs.writeJSON(configPath, config, { spaces: 2 });

// 2. Verify file was written
const exists = await fs.pathExists(configPath);

// 3. Read back and verify
const loaded = await fs.readJSON(configPath);
console.log('Config persisted:', loaded);
```

## Important Patterns

### Error Handling in IPC Handlers

Always return structured responses:
```typescript
return { success: true, data: ... };
return { success: false, error: message };
```

### Preventing Duplicate Installations

Before any install operation:
```typescript
if (installLocks.get(tool)) {
  return { success: false, installing: true };
}
installLocks.set(tool, true);
try {
  // install logic
} finally {
  installLocks.delete(tool);
}
```

### TypeScript Configuration

- **React components**: Use `tsconfig.json` (includes JSX support)
- **Electron code**: Use `tsconfig.electron.json` (CommonJS, no JSX)
- Do NOT mix these - keep Electron code separate from React code

## Packaging Notes

**electron-builder configuration** (`package.json:44-78`):
- Outputs to `release/` directory
- Generates both NSIS installer and portable .exe
- Packages: `dist/`, `build/`, `package.json`, `node_modules/`
- Entry point: `dist/main.js`

**IMPORTANT**: The packaged app uses `dist/main.js` as entry point, not `src/main.ts`. Always test with `npm run dist` before distributing.

## Dependency Management

### Before Installing Dependencies

**Always verify package versions exist on npm:**

```bash
# Check if package version exists
npm view <package-name>@<version>

# Check peer dependencies
npm info <package-name> peerDependencies
```

**Why**: Installing non-existent versions or missing peer dependencies causes runtime errors.

### Environment Setup

**Required tools for development:**
- Node.js 22+
- npm (comes with Node.js)
- Git
- pnpm (can be auto-installed via installer)

**Verify environment before building:**
```bash
node --version
npm --version
git --version
pnpm --version
```

## Browser Cache Awareness

**For Electron/web-based apps, browser caching can hide code changes:**

When testing changes that don't appear:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Or restart Electron app completely

**Why**: Multiple sessions were frustrated by "unchanged behavior" when the real issue was cached old code.

## Common Issues

**Issue**: Hardcoded paths in packaged app
**Solution**: Use `app.getPath()` or `process.env.USERPROFILE` instead of absolute paths

**Issue**: pnpm installation fails with garbled output
**Solution**: Use `encoding: 'utf8'` and `LANG: 'en_US.UTF-8'` in execAsync options

**Issue**: Gateway process not stopping
**Solution**: Check `gatewayProcess` is not null before calling `kill()`

**Issue**: Config changes not persisting
**Solution**: Verify read/write use same path, ensure `fs.writeJSON()` uses `{ spaces: 2 }`

**Issue**: Changes not appearing in running app
**Solution**: Clear browser cache or restart Electron app completely

**Issue**: TypeScript errors at runtime
**Solution**: Run `npx tsc --noEmit` before testing to catch type errors early

## Advanced Claude Code Features

### Custom Skills

Create reusable prompts as markdown files that run with `/command`:

```bash
# Create a skill for type checking
mkdir -p .claude/skills/typecheck
cat > .claude/skills/typecheck/SKILL.md << 'EOF'
# TypeCheck Skill

Run TypeScript type checking:
1. Run `npx tsc --noEmit`
2. Fix any type errors
3. Verify imports are correct
EOF

# Use it with: /typecheck
```

**Why useful**: You have repetitive workflows like config fixes, plugin management, and build/test cycles. Create `/build`, `/typecheck`, `/configfix` skills to save time.

### Hooks

Auto-run shell commands at lifecycle events:

```json
// Add to .claude/settings.json
{
  "hooks": {
    "afterEdit": "npx prettier --write {file} && npx tsc --noEmit"
  }
}
```

**Why useful**: With 160+ TypeScript files, auto-format and type-check on every edit catches errors early.

### Task Agents

Use agents for codebase exploration:

```
Ask: "Use an agent to explore the OpenClaw plugin system architecture
and document how plugins are loaded and configured"
```

**Why useful**: Agents can explore unfamiliar code while you focus on implementation. They gather context without cluttering your main conversation.

### MCP Servers

Connect Claude to external tools, databases, and APIs:

```bash
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

**Why useful**: Integrate GitHub for issue lookup, or databases for query help.

### Headless Mode

Run Claude non-interactively from scripts and CI/CD:

```bash
claude -p "fix all TypeScript type errors in src/" \
  --allowedTools "Edit,Read,Bash" \
  --output results.json
```

**Why useful**: Automate repetitive fixes in CI/CD pipelines for your installer and React Native apps.

## Recommended Usage Patterns

### Pattern 1: Root Cause Before Implementation

**Before fixing any issue, identify and verify the root cause:**

```
Ask Claude: "Before fixing this issue, state your hypothesis for the root cause
and verify it by checking the relevant code/config. Only implement a fix after
confirming the root cause."
```

**Why**: Prevents surface-level fixes that don't solve the actual problem. Multiple sessions had issues where wrong config paths or browser caching were the real problems, not the code logic.

### Pattern 2: Verify Config Paths First

**When debugging config issues:**

```
Ask Claude: "Before fixing this config issue, show me:
1) Which config file path is being read
2) Which path is being written to
3) Verify both paths exist and are the same file
Then make the fix."
```

**Why**: Saves hours of debugging why config changes don't persist. Multiple sessions failed because code read from one path but wrote to another.

### Pattern 3: Type-Check Before Testing

**After any TypeScript changes:**

```
Ask Claude: "Before we test this, run `npx tsc --noEmit` to check for any
TypeScript errors. Fix all type issues before proceeding to runtime testing."
```

**Why**: Type errors caught at compile time save hours of runtime debugging. Especially important after multi-file changes.

### Pattern 4: Test Before Declaring Done

**After implementing features:**

```
Ask Claude: "After making these changes, run the application and verify:
1) The feature works as expected
2) No runtime errors occur
3) Config changes persist correctly
Show me the test results."
```

**Why**: Many issues only surface at runtime. Testing catches problems before users discover them.

### Pattern 5: Minimal Implementation First

**When starting a task:**

```
Ask Claude: "Implement this with the absolute minimum code needed.
No extra abstractions, no additional features, just the core functionality
that solves the immediate problem."
```

**Why**: Simpler code has fewer bugs and is easier to verify. Add complexity only when actually needed.

### Pattern 6: Use Agents for Exploration

**When working with unfamiliar code:**

```
Ask Claude: "Use an agent to explore [specific system/module] and create
a detailed document explaining:
1) Architecture and key components
2) How data flows through the system
3) Important patterns and conventions to follow"
```

**Why**: Agents can explore and document systems while you focus on implementation, without cluttering your main conversation.
