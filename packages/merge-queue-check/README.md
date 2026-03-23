# merge-queue-check

A CLI tool to check GitHub merge queue status and send notifications.

## Usage

```bash
merge-queue-check -o <owner> -r <repo> -t <token>
```

## Options

- `-o, --owner <owner>` - Required. GitHub repository owner
- `-r, --repo <repo>` - Required. GitHub repository name
- `-t, --token <token>` - Required. GitHub personal access token
- `-h, --help` - Show help message

## Examples

```bash
# Check merge queue
merge-queue-check -o github -r octocat -t ghp_xxx

# For Apple Shortcuts
merge-queue-check -o "github" -r "octocat" -t "your_github_token"
```

## Features

- **GitHub API Integration**: Fetches merge queue entries from GitHub
- **Native Notifications**: Shows macOS notification with queue status
- **Queue Count**: Displays number of PRs in the merge queue
- **PR Details**: Shows PR numbers and titles in console output

## How it works

1. Connects to GitHub API and fetches open pull requests
2. Checks each PR to see if it's in the merge queue
3. Sends a native macOS notification:
   - "Merge Queue Empty" if no PRs are queued
   - Shows count of PRs in queue if any are found
4. Logs PR details to console

## Requirements

- Node.js 18+ (for native fetch API support)
- macOS (for native notifications)
- GitHub Personal Access Token with appropriate permissions

### GitHub Token Permissions

The tool needs a GitHub Personal Access Token with:

- **Private repositories**: `repo` scope
- **Public repositories**: `public_repo` scope
- **Fine-grained tokens**: Enable "Pull requests: Read" permission

To create a token:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a classic token with the appropriate scope, or
3. Create a fine-grained token with "Pull requests: Read" permission

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
   cd /path/to/merge-queue-check && pnpm start -o "owner" -r "repo" -t "your_github_token"
   ```
3. Set the input to "Shortcut Input"
4. Now you can quickly check merge queue status!

When merge queue has PRs, you'll get a notification showing the count. When it's empty, you'll get a "Merge Queue Empty" notification.
