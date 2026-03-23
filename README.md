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

This is a pnpm workspace. Each package in the `packages/` directory is an independent CLI tool.

```
packages/
└── why-failed/     # GitHub workflow failure investigator
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
