# pr-merge-monitor

Monitor a GitHub pull request until it is merged, removed from auto-merge or the merge queue, closed without merge, or a timeout is reached.

## Features

- Polls a single PR with one GraphQL request per check
- Detects when the PR is merged
- Detects when the PR drops out of auto-merge or the merge queue after previously entering that flow
- Sends macOS notifications for merge, removal, close, timeout, and errors
- Configurable timeout and polling interval

## Usage

```bash
cd packages/pr-merge-monitor
pnpm start -o <owner> -r <repo> -p <pr-number> -t <token> [--timeout 45] [--interval 30]
```

## Options

- `-o, --owner <owner>`: GitHub repository owner
- `-r, --repo <repo>`: GitHub repository name
- `-p, --pr <number>`: Pull request number to monitor
- `-t, --token <token>`: GitHub personal access token
- `--timeout <minutes>`: Maximum monitoring time in minutes, default `45`
- `--interval <seconds>`: Poll interval in seconds, default `30`

## Examples

```bash
pnpm start -o openai -r example-repo -p 1234 -t ghp_xxx
pnpm start -o openai -r example-repo -p 1234 -t ghp_xxx --timeout 40 --interval 20
```

## How detection works

- `merged`: the PR reports `merged` or has a `mergedAt` timestamp
- `left merge flow`: the PR was previously seen with `autoMergeRequest` or `mergeQueueEntry`, and GitHub later emits an `AutoMergeDisabledEvent` or `RemovedFromMergeQueueEvent`
- `closed`: the PR is closed without being merged
- `timeout`: the monitor exceeded the configured timeout

If the PR has not entered auto-merge or the merge queue yet, or if the live queue fields disappear briefly without a corresponding removal event, the tool keeps waiting instead of immediately treating that as failure.
