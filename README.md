# Github-Utils

A collection of useful CLI tools for GitHub workflow management and automation.

## Packages

### why-failed

Investigate failed GitHub workflow runs with AI-powered analysis.

**Key Features:**
- Downloads workflow artifacts and extracts them
- Fetches logs for all failed jobs (supports 100+ jobs with pagination)
- Generates comprehensive markdown reports
- AI analysis with customizable agents (Codex or custom)
- Custom prompts to guide AI analysis
- Interactive macOS notifications
- Stores data temporarily in `/tmp` for automatic cleanup

**Usage:**
```bash
cd packages/why-failed
pnpm start -w <workflow-url> -t <token> [-a <prefix>] [-g <agent>] [-p <prompt>]
```

See [packages/why-failed/README.md](packages/why-failed/README.md) for detailed documentation.

### merge-queue-check

Check GitHub merge queue status and send notifications.

**Key Features:**
- Single GraphQL API call for fast performance
- Shows count of PRs in merge queue
- Sends macOS notifications
- Lists PR numbers and titles in console

**Usage:**
```bash
cd packages/merge-queue-check
pnpm start -o <owner> -r <repo> -t <token>
```

See [packages/merge-queue-check/README.md](packages/merge-queue-check/README.md) for detailed documentation.

### workflow-running

Check if there are any running GitHub workflow runs and send notifications.

**Key Features:**
- Single REST API call to fetch running workflows
- Optional filtering by specific workflow ID or filename
- Shows workflow name, run number, branch, and URL
- Sends macOS notifications

**Usage:**
```bash
cd packages/workflow-running
pnpm start -o <owner> -r <repo> -t <token> [-w <workflow-id>]
```

See [packages/workflow-running/README.md](packages/workflow-running/README.md) for detailed documentation.

### pr-merge-monitor

Monitor a pull request until it is merged, removed from auto-merge or the merge queue, closed without merging, or times out.

**Key Features:**
- Monitors a single PR with repeated GraphQL checks
- Detects successful merge completion
- Detects when a PR is kicked out of auto-merge or the merge queue
- Sends timeout notifications after a configurable monitoring window
- Sends macOS notifications with a link back to the PR

**Usage:**
```bash
cd packages/pr-merge-monitor
pnpm start -o <owner> -r <repo> -p <pr-number> -t <token> [--timeout 45] [--interval 30]
```

See [packages/pr-merge-monitor/README.md](packages/pr-merge-monitor/README.md) for detailed documentation.

### github-pr-reviewer (Raycast Extension)

Enhanced GitHub PR review management Raycast extension.

**Key Features:**
- View all PRs awaiting your review (personal + team requests)
- Track your own PRs' review status
- Menu bar with review count
- Detailed PR info (checks, labels, changes)
- Organization and repository filtering
- Quick actions (open, copy, refresh)

**Commands:**
- **Review Requests** - View PRs awaiting your review
- **My Pull Requests** - Manage your own PRs
- **Menu Bar** - Quick access from macOS menu bar

**Setup:**
1. Install the extension in Raycast
2. Configure GitHub Personal Access Token in preferences
3. Optional: Set organizations to filter by

See [packages/github-pr-reviewer/README.md](packages/github-pr-reviewer/README.md) for detailed documentation.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Navigate to the package you want to use:
   ```bash
   cd packages/why-failed
   ```

3. Follow the package-specific README for usage instructions.

## Workspace Structure

This is a pnpm workspace. Each package in the `packages/` directory is an independent tool:
- CLI tools for GitHub automation
- Raycast extensions for developer productivity

```
packages/
├── why-failed/          # GitHub workflow failure investigator
├── merge-queue-check/   # GitHub merge queue status checker
├── workflow-running/    # GitHub running workflow checker
├── pr-merge-monitor/    # PR merge / queue monitor with notifications
└── github-pr-reviewer/  # Raycast extension for PR reviews
```

## Development

To add a new package:

1. Create a new directory in `packages/`
2. Initialize with `package.json`
3. Add TypeScript configuration
4. Update this README

## Requirements

- Node.js 18+
- pnpm
- macOS (for packages using native notifications)

## License

ISC
