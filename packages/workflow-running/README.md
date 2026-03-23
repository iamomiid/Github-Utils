# workflow-running

A CLI tool to check for running GitHub workflow runs and send notifications.

## Usage

```bash
workflow-running -o <owner> -r <repo> -t <token> [-w <workflow-id>]
```

## Options

- `-o, --owner <owner>` - Required. GitHub repository owner
- `-r, --repo <repo>` - Required. GitHub repository name
- `-t, --token <token>` - Required. GitHub personal access token
- `-w, --workflow <id>` - Optional. Workflow ID or filename to filter by (e.g., `ci.yml` or `12345678`)
- `-h, --help` - Show help message

## Examples

```bash
# Check all running workflows
workflow-running -o github -r octocat -t ghp_xxx

# Check specific workflow by filename
workflow-running -o github -r octocat -t ghp_xxx -w ci.yml

# Check specific workflow by ID
workflow-running -o github -r octocat -t ghp_xxx -w 12345678

# For Apple Shortcuts
workflow-running -o "github" -r "octocat" -t "your_github_token"
```

## Features

- **GitHub API Integration**: Fetches running workflow runs from GitHub
- **Native Notifications**: Shows macOS notification with workflow status
- **Workflow Filtering**: Optional filtering by specific workflow ID or filename
- **Run Details**: Shows workflow name, run number, branch, and URL
- **Single API Call**: Efficient REST API usage

## How it works

1. Connects to GitHub API and fetches in-progress workflow runs
2. Optionally filters by a specific workflow if provided
3. Sends a native macOS notification:
   - "No Running Workflows" if none are found
   - Shows count of running workflows if any are found
4. Logs workflow details to console including branch, start time, and URL

## Requirements

- Node.js 18+ (for native fetch API support)
- macOS (for native notifications)
- GitHub Personal Access Token with appropriate permissions

### GitHub Token Permissions

The tool needs a GitHub Personal Access Token with:

- **Private repositories**: `repo` scope
- **Public repositories**: `public_repo` scope
- **Fine-grained tokens**: Enable "Actions: Read" permission

To create a token:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a classic token with the appropriate scope, or
3. Create a fine-grained token with "Actions: Read" permission

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
   cd /path/to/workflow-running && pnpm start -o "owner" -r "repo" -t "your_github_token"
   ```
3. Set the input to "Shortcut Input"
4. Now you can quickly check workflow status!

When workflows are running, you'll get a notification showing the count. When none are running, you'll get a "No Running Workflows" notification.
