# why-failed

A CLI tool to investigate failed GitHub workflow runs, download artifacts, and analyze failures with AI.

## Usage

```bash
why-failed -w <workflow-url> -t <token> [-a <artifact-prefix>] [-g <agent-command>] [-p <custom-prompt>]
```

## Options

- `-w, --workflow-url <url>` - Required. GitHub workflow run URL
- `-t, --token <token>` - Required. GitHub personal access token
- `-a, --artifact-prefix <prefix>` - Optional. Only download artifacts starting with this prefix
- `-g, --agent <command>` - Optional. Custom coding agent command (default: `codex exec --full-auto --skip-git-repo-check`)
- `-p, --prompt <text>` - Optional. Additional instructions to append to the AI prompt
- `-h, --help` - Show help message

## Examples

```bash
# Basic usage with default agent (codex)
why-failed -w https://github.com/owner/repo/actions/runs/123456789 -t ghp_xxx

# With artifact filter
why-failed -w https://github.com/owner/repo/actions/runs/123456789 -t ghp_xxx -a playwright-report

# With custom agent
why-failed -w https://github.com/owner/repo/actions/runs/123456789 -t ghp_xxx -g 'openai run'

# With custom prompt for AI analysis
why-failed -w https://github.com/owner/repo/actions/runs/123456789 -t ghp_xxx -p 'Focus on test failures in the e2e suite'

# Combine multiple options
why-failed -w https://github.com/owner/repo/actions/runs/123456789 -t ghp_xxx -a playwright -p 'Check for flaky tests'

# For Apple Shortcuts
why-failed -w "$1" -t "your_github_token"
```

## Features

- **GitHub API Integration**: Fetches workflow run info, jobs, and artifacts
- **Pagination Support**: Handles workflows with 100+ jobs
- **Artifact Management**: Downloads, extracts, and catalogs all artifacts
- **AI Analysis**: Analyzes failures using customizable coding agents
- **Custom Prompts**: Add your own instructions to guide the AI analysis
- **Interactive Notifications**: Shows job count and opens analysis report on click
- **Comprehensive Reports**: Generates markdown report and HTML analysis

## How it works

1. Parses the GitHub workflow run URL to extract owner, repo, and run ID
2. Fetches workflow run info and checks the conclusion
3. Downloads all artifacts (optionally filtered by prefix) and extracts them
4. Fetches all jobs from the workflow run (with pagination support for 100+ jobs)
5. Filters for jobs that failed or were cancelled
6. Fetches logs for each failed job
7. Creates a folder with:
   - `report.md` - Detailed markdown report
   - Extracted artifact directories
8. **If agent is available**: Sends report and artifacts to AI agent for analysis
9. Generates `analysis.html` with:
   - Root cause analysis
   - Retry recommendations
   - Verdict on whether it's safe to retry
10. Sends a native macOS notification:
    - Shows number of failed jobs (e.g., "5 job(s) failed")
    - Click to open the HTML analysis report

### Output

The tool creates a temporary folder in `/tmp` named:
```
/tmp/workflow-failure-{owner}-{repo}-{runId}-{timestamp}/
```

**Note:** Since files are stored in `/tmp`, they will be automatically cleaned up by the system. Make sure to review the analysis immediately or copy files elsewhere if needed.

This folder contains:
- `report.md` - Detailed markdown report with:
  - Repository and run information
  - List of all failed jobs with status and logs (in collapsible sections)
  - List of all artifacts with extracted directory contents and file sizes
- Extracted artifact directories (e.g., `playwright-report-12345/`)
- `analysis.html` - (If agent is available) AI-generated analysis with styling

## Requirements

- Node.js 18+ (for native fetch API support)
- macOS (for native notifications)
- GitHub Personal Access Token with appropriate permissions
- **Optional**: Coding agent CLI for AI analysis (see below)

### GitHub Token Permissions

The tool needs a GitHub Personal Access Token with read access to workflow runs:

- **Private repositories**: `repo` scope
- **Public repositories**: `public_repo` scope
- **Fine-grained tokens**: Enable "Actions: Read-only" permission

To create a token:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a classic token with the appropriate scope, or
3. Create a fine-grained token with "Actions: Read-only" permission

### Optional: Coding Agent

The tool can use any coding agent CLI that accepts instructions via stdin. Examples:

#### Codex (default)
```bash
npm install -g @openai/codex
# Uses: codex exec --full-auto
```

#### Custom Agent
```bash
# Use any agent that reads from stdin and creates files
why-failed -w <url> -t <token> -g 'your-agent-command'
```

If no agent is installed, the tool will skip AI analysis and only generate the markdown report.

#### Custom Prompts

You can add custom instructions to the AI agent using the `-p` or `--prompt` flag:

```bash
# Add context about your specific setup
why-failed -w <url> -t <token> -p 'This is a Rails app. Focus on database migration errors.'

# Ask for specific analysis
why-failed -w <url> -t <token> -p 'Check if this is a known flaky test issue'

# Combine with artifact filtering
why-failed -w <url> -t <token> -a playwright -p 'Analyze the test screenshots and identify UI failures'
```

The custom prompt is appended to the default instructions sent to the AI agent, allowing you to:
- Provide context about your project
- Request specific types of analysis
- Focus on particular aspects of the failure
- Ask specific questions about the workflow

## Development

```bash
pnpm install
pnpm run dev        # Run with hot reload
pnpm run typecheck  # Check TypeScript types
```

## Apple Shortcuts Integration

1. Create a new Shortcut
2. Add a "Run Shell Script" action:
   ```bash
   cd /path/to/why-failed && pnpm start -w "$1" -t "your_github_token"
   ```
3. Set the input to "Shortcut Input"
4. Now you can share workflow URLs directly to this shortcut!

When a workflow fails, you'll get a notification showing the number of failed jobs. Click it to open the AI analysis report.
