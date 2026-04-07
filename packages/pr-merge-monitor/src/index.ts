#!/usr/bin/env node
/**
 * pr-merge-monitor - Monitor a PR until it merges, drops out of auto-merge or
 * the merge queue, closes unmerged, or exceeds a timeout.
 *
 * Usage:
 *   pr-merge-monitor -o <owner> -r <repo> -p <pr-number> -t <token>
 *     [--timeout 45] [--interval 30]
 */
import * as notifier from "node-notifier";

interface ParsedArgs {
  owner: string;
  repo: string;
  prNumber: number;
  token: string;
  timeoutMinutes: number;
  intervalSeconds: number;
}

interface PullRequestSnapshot {
  number: number;
  title: string;
  url: string;
  state: string;
  closed: boolean;
  merged: boolean;
  mergedAt: string | null;
  autoMergeEnabledAt: string | null;
  mergeQueueEntry: {
    id: string;
    position: number;
    state: string;
  } | null;
  recentEvents: PullRequestEvent[];
}

type PullRequestEvent =
  | {
      type: "added-to-merge-queue";
      createdAt: string;
    }
  | {
      type: "removed-from-merge-queue";
      createdAt: string;
      reason: string | null;
    }
  | {
      type: "auto-merge-disabled";
      createdAt: string;
      reason: string | null;
      reasonCode: string | null;
    }
  | {
      type: "merged";
      createdAt: string;
    }
  | {
      type: "closed";
      createdAt: string;
    };

interface GraphQLResponse {
  data?: {
    repository?: {
      pullRequest?: {
        number: number;
        title: string;
        url: string;
        state: string;
        closed: boolean;
        merged: boolean;
        mergedAt: string | null;
        autoMergeRequest: {
          enabledAt: string | null;
        } | null;
        mergeQueueEntry: {
          id: string;
          position: number;
          state: string;
        } | null;
        timelineItems?: {
          nodes?: Array<{
            __typename: string;
            createdAt?: string;
            reason?: string | null;
            reasonCode?: string | null;
          } | null>;
        };
      } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

type MonitorOutcome =
  | { type: "merged"; snapshot: PullRequestSnapshot; elapsedMs: number }
  | {
      type: "kicked-out";
      snapshot: PullRequestSnapshot;
      elapsedMs: number;
      reason: string | null;
    }
  | { type: "closed"; snapshot: PullRequestSnapshot; elapsedMs: number }
  | { type: "timeout"; snapshot: PullRequestSnapshot; elapsedMs: number }
  | { type: "error"; message: string };

function parseArgs(argv: string[]): ParsedArgs {
  const args: Partial<ParsedArgs> = {
    timeoutMinutes: 45,
    intervalSeconds: 30,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-o" || arg === "--owner") {
      args.owner = argv[++i];
    } else if (arg === "-r" || arg === "--repo") {
      args.repo = argv[++i];
    } else if (arg === "-p" || arg === "--pr") {
      args.prNumber = Number(argv[++i]);
    } else if (arg === "-t" || arg === "--token") {
      args.token = argv[++i];
    } else if (arg === "--timeout") {
      args.timeoutMinutes = Number(argv[++i]);
    } else if (arg === "--interval") {
      args.intervalSeconds = Number(argv[++i]);
    } else if (arg === "-h" || arg === "--help") {
      showHelp();
      process.exit(0);
    }
  }

  if (
    !args.owner ||
    !args.repo ||
    !args.token ||
    !args.prNumber ||
    Number.isNaN(args.prNumber) ||
    !args.timeoutMinutes ||
    Number.isNaN(args.timeoutMinutes) ||
    args.timeoutMinutes <= 0 ||
    !args.intervalSeconds ||
    Number.isNaN(args.intervalSeconds) ||
    args.intervalSeconds <= 0
  ) {
    showHelp();
    process.exit(1);
  }

  return args as ParsedArgs;
}

function showHelp() {
  console.log("Usage: pr-merge-monitor [options]");
  console.log("");
  console.log("Options:");
  console.log("  -o, --owner <owner>      Required. GitHub repository owner");
  console.log("  -r, --repo <repo>        Required. GitHub repository name");
  console.log("  -p, --pr <number>        Required. Pull request number");
  console.log("  -t, --token <token>      Required. GitHub personal access token");
  console.log("  --timeout <minutes>      Optional. Timeout in minutes. Default: 45");
  console.log("  --interval <seconds>     Optional. Poll interval in seconds. Default: 30");
  console.log("  -h, --help               Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  pr-merge-monitor -o owner -r repo -p 123 -t ghp_xxx");
  console.log("  pr-merge-monitor -o owner -r repo -p 123 -t ghp_xxx --timeout 40 --interval 20");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function buildQuery(): string {
  return `
    query PullRequestMonitor($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          number
          title
          url
          state
          closed
          merged
          mergedAt
          autoMergeRequest {
            enabledAt
          }
          mergeQueueEntry {
            id
            position
            state
          }
          timelineItems(last: 20) {
            nodes {
              __typename
              ... on AddedToMergeQueueEvent {
                createdAt
              }
              ... on RemovedFromMergeQueueEvent {
                createdAt
                reason
              }
              ... on AutoMergeDisabledEvent {
                createdAt
                reason
                reasonCode
              }
              ... on MergedEvent {
                createdAt
              }
              ... on ClosedEvent {
                createdAt
              }
            }
          }
        }
      }
    }
  `;
}

function mapTimelineItems(nodes: unknown[] | undefined): PullRequestEvent[] {
  if (!nodes) {
    return [];
  }

  const events: PullRequestEvent[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== "object" || !("__typename" in node)) {
      continue;
    }

    const item = node as Record<string, unknown>;

    switch (item.__typename) {
      case "AddedToMergeQueueEvent":
        if (typeof item.createdAt === "string") {
          events.push({
            type: "added-to-merge-queue",
            createdAt: item.createdAt,
          });
        }
        break;
      case "RemovedFromMergeQueueEvent":
        if (typeof item.createdAt === "string") {
          events.push({
            type: "removed-from-merge-queue",
            createdAt: item.createdAt,
            reason: typeof item.reason === "string" ? item.reason : null,
          });
        }
        break;
      case "AutoMergeDisabledEvent":
        if (typeof item.createdAt === "string") {
          events.push({
            type: "auto-merge-disabled",
            createdAt: item.createdAt,
            reason: typeof item.reason === "string" ? item.reason : null,
            reasonCode:
              typeof item.reasonCode === "string" ? item.reasonCode : null,
          });
        }
        break;
      case "MergedEvent":
        if (typeof item.createdAt === "string") {
          events.push({
            type: "merged",
            createdAt: item.createdAt,
          });
        }
        break;
      case "ClosedEvent":
        if (typeof item.createdAt === "string") {
          events.push({
            type: "closed",
            createdAt: item.createdAt,
          });
        }
        break;
      default:
        break;
    }
  }

  return events.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

async function fetchPullRequestSnapshot(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
): Promise<PullRequestSnapshot> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "pr-merge-monitor/1.0.0",
    },
    body: JSON.stringify({
      query: buildQuery(),
      variables: {
        owner,
        repo,
        number: prNumber,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as GraphQLResponse;

  if (data.errors?.length) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }

  const pullRequest = data.data?.repository?.pullRequest;

  if (!pullRequest) {
    throw new Error(`Pull request #${prNumber} was not found in ${owner}/${repo}`);
  }

  return {
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.url,
    state: pullRequest.state,
    closed: pullRequest.closed,
    merged: pullRequest.merged,
    mergedAt: pullRequest.mergedAt,
    autoMergeEnabledAt: pullRequest.autoMergeRequest?.enabledAt ?? null,
    mergeQueueEntry: pullRequest.mergeQueueEntry,
    recentEvents: mapTimelineItems(
      (
        pullRequest as {
          timelineItems?: {
            nodes?: unknown[];
          };
        }
      ).timelineItems?.nodes,
    ),
  };
}

function describeSnapshot(snapshot: PullRequestSnapshot): string {
  const parts = [`PR #${snapshot.number}`];

  if (snapshot.merged) {
    parts.push("merged");
  } else if (snapshot.closed) {
    parts.push("closed");
  } else if (snapshot.mergeQueueEntry) {
    parts.push(
      `in merge queue at position ${snapshot.mergeQueueEntry.position} (${snapshot.mergeQueueEntry.state})`,
    );
  } else if (snapshot.autoMergeEnabledAt) {
    parts.push("auto-merge enabled");
  } else {
    parts.push(snapshot.state.toLowerCase());
  }

  return parts.join(", ");
}

function findKickoutReason(
  snapshot: PullRequestSnapshot,
  startedAtIso: string,
): string | null {
  const startedAtMs = new Date(startedAtIso).getTime();

  const candidate = [...snapshot.recentEvents]
    .reverse()
    .find((event) => {
      const eventMs = new Date(event.createdAt).getTime();
      return (
        eventMs >= startedAtMs &&
        (event.type === "removed-from-merge-queue" ||
          event.type === "auto-merge-disabled")
      );
    });

  if (!candidate) {
    return null;
  }

  if (candidate.type === "removed-from-merge-queue") {
    return candidate.reason
      ? `Removed from merge queue: ${candidate.reason}`
      : "Removed from merge queue";
  }

  return candidate.reasonCode || candidate.reason
    ? `Auto-merge disabled: ${candidate.reasonCode ?? candidate.reason}`
    : "Auto-merge disabled";
}

async function monitorPullRequest(args: ParsedArgs): Promise<MonitorOutcome> {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const timeoutAt = startedAt + args.timeoutMinutes * 60_000;
  let seenAutoMergeOrQueue = false;
  let lastSnapshot: PullRequestSnapshot | null = null;

  while (Date.now() <= timeoutAt) {
    const snapshot = await fetchPullRequestSnapshot(
      args.owner,
      args.repo,
      args.prNumber,
      args.token,
    );
    lastSnapshot = snapshot;

    if (snapshot.autoMergeEnabledAt || snapshot.mergeQueueEntry) {
      seenAutoMergeOrQueue = true;
    }

    const elapsedMs = Date.now() - startedAt;

    console.log(
      `[${new Date().toISOString()}] ${describeSnapshot(snapshot)} after ${formatDuration(elapsedMs)}`,
    );

    if (snapshot.merged || snapshot.mergedAt) {
      return { type: "merged", snapshot, elapsedMs };
    }

    if (snapshot.closed) {
      return { type: "closed", snapshot, elapsedMs };
    }

    if (
      seenAutoMergeOrQueue &&
      !snapshot.autoMergeEnabledAt &&
      !snapshot.mergeQueueEntry
    ) {
      const reason = findKickoutReason(snapshot, startedAtIso);

      if (reason) {
        return {
          type: "kicked-out",
          snapshot,
          elapsedMs,
          reason,
        };
      }
    }

    const remainingMs = timeoutAt - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await sleep(Math.min(args.intervalSeconds * 1000, remainingMs));
  }

  if (lastSnapshot) {
    return {
      type: "timeout",
      snapshot: lastSnapshot,
      elapsedMs: Date.now() - startedAt,
    };
  }

  return {
    type: "error",
    message: "No pull request state was retrieved before timing out",
  };
}

function notify(title: string, message: string, open?: string) {
  notifier.notify({
    title,
    message,
    wait: false,
    open,
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    console.log(
      `Monitoring ${args.owner}/${args.repo} PR #${args.prNumber} every ${args.intervalSeconds}s for up to ${args.timeoutMinutes}m...`,
    );

    const outcome = await monitorPullRequest(args);

    switch (outcome.type) {
      case "merged": {
        const message = `${args.owner}/${args.repo}#${outcome.snapshot.number} merged after ${formatDuration(outcome.elapsedMs)}`;
        notify("✅ PR Merged", message, outcome.snapshot.url);
        console.log(message);
        return;
      }
      case "kicked-out": {
        const reasonSuffix = outcome.reason ? ` ${outcome.reason}.` : "";
        const message = `${args.owner}/${args.repo}#${outcome.snapshot.number} left auto-merge or the merge queue after ${formatDuration(outcome.elapsedMs)}.${reasonSuffix}`;
        notify("⚠️ PR Left Merge Flow", message, outcome.snapshot.url);
        console.log(message);
        process.exit(2);
      }
      case "closed": {
        const message = `${args.owner}/${args.repo}#${outcome.snapshot.number} was closed without merging after ${formatDuration(outcome.elapsedMs)}`;
        notify("⚠️ PR Closed", message, outcome.snapshot.url);
        console.log(message);
        process.exit(2);
      }
      case "timeout": {
        const message = `${args.owner}/${args.repo}#${outcome.snapshot.number} did not finish within ${args.timeoutMinutes}m. Check the PR manually.`;
        notify("⏱️ PR Monitor Timed Out", message, outcome.snapshot.url);
        console.log(message);
        process.exit(3);
      }
      case "error": {
        throw new Error(outcome.message);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    notify("❌ PR Monitor Failed", message);
    console.error("Error:", message);
    process.exit(1);
  }
}

void main();
