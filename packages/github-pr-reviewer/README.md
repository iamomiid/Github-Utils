# GitHub PR Reviewer

A Raycast extension for enhanced GitHub pull request review management.

## ⚠️ TypeScript Type Checking Note

This extension uses the latest Raycast API which implements React Server Components. There are known TypeScript type checking incompatibilities with React 18's JSX types when components return `Promise<ReactNode>`. This is a cosmetic issue with type checking only - the code compiles and runs correctly.

### Workaround for Development

To build this extension, you may need to add `// @ts-expect-error` comments before JSX elements that show type errors, or disable strict type checking in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": false
  }
}
```

The extension will still work correctly at runtime.

## Features

### 1. Review Requests
View all PRs that are awaiting your review, including:
- **Personal review requests** - PRs where you've been directly requested to review
- **Team review requests** - PRs where your teams have been requested
- Smart categorization and filtering
- Detailed PR information (labels, checks status, code changes, comments)

### 2. My Pull Requests
Manage your own pull requests with status tracking:
- **Changes Requested** - PRs where reviewers asked for changes
- **Waiting for Review** - PRs still awaiting review
- **Approved** - PRs that are ready to merge

### 3. Menu Bar
Stay on top of your reviews with the menu bar:
- Shows count of pending reviews
- Quick access to recent PRs
- Different icons for personal vs team requests
- Updates every 5 minutes

## Installation

1. Install the Raycast CLI:
   ```bash
   npm install -g @raycast/api
   ```

2. Install dependencies:
   ```bash
   cd packages/github-pr-reviewer
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Install in Raycast:
   ```bash
   npm run publish
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Configuration

Open Raycast Preferences → Extensions → GitHub PR Reviewer to configure:

### Personal Access Token (Required)

**Minimum Required Scopes:**
- `repo` - Access private repositories

**Optional Scopes:**
- `read:org` - Required only if you want to see **team review requests**. Without this, you'll only see PRs where you were personally requested to review (not your teams).

**Note:** GitHub may show a warning about `read:discussions` scope, but this extension does NOT use discussions. This is a GitHub-side requirement for certain GraphQL queries.

**To create a token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select at minimum `repo` scope
4. Add `read:org` if you want team review request support
5. Generate and copy the token

### Include Team Review Requests
Toggle whether to show PRs where your teams are requested (not just you personally).

### Organizations
Filter PRs by specific organizations (comma-separated). Leave empty to see all.

### Excluded Repositories
Exclude specific repositories from results (format: `owner/repo`, comma-separated).

## Usage

### Review Requests
```
Command: Review Requests
Keyboard: Type "review" in Raycast
```

Shows all PRs awaiting your review, grouped by:
- Personal requests
- Team requests

**Actions:**
- `↵` - Open PR in browser
- `⌘ + .` - Copy PR URL
- `⌘ + ⇧ + .` - Copy PR number
- `⌘ + ⇧ + o` - Open repository
- `⌘ + r` - Refresh

### My Pull Requests
```
Command: My Pull Requests
Keyboard: Type "my pr" in Raycast
```

Shows your own PRs grouped by status.

### Menu Bar
```
Command: PR Reviewer Menu Bar
```

Shows in your macOS menu bar with:
- Icon changes based on review count
- Shows first 10 PRs in dropdown
- Click to open PR directly

## Enhanced Features (Beyond Original)

Compared to the original `github-review-requests` extension:

1. **Team Review Requests** - See PRs where your teams are requested, not just you
2. **My Pull Requests View** - Track your own PRs' review status
3. **Detailed PR Information**:
   - Check status (success/failure/pending)
   - Lines changed (+/-)
   - Comment count
   - Labels
   - Last updated time
4. **Smart Filtering** - Filter by personal/team requests or PR status
5. **Organization Filtering** - Focus on specific orgs
6. **Repository Exclusions** - Hide repos you don't care about
7. **Better UI** - Detail view with metadata, icons, and colors
8. **Quick Actions** - Copy URLs, open in GitHub Desktop, refresh

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Requirements

- Raycast v1.50+
- macOS 12+
- GitHub Personal Access Token

## License

MIT
