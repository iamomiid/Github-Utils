#!/usr/bin/env node
/**
 * merge-queue-check - A CLI tool to check GitHub merge queue status
 *
 * Usage: merge-queue-check -o <owner> -r <repo> -t <token>
 *
 * This tool checks if there are any PRs in the merge queue and sends a notification.
 */
import * as notifier from "node-notifier";

interface PullRequest {
	number: number;
	title: string;
	head: {
		ref: string;
	};
	user: {
		login: string;
	};
	updated_at: string;
}

interface MergeQueueEntry {
	id: string;
	position: number;
	state: string;
	pull_request: PullRequest;
	enqueued_at: string;
}

interface ParsedArgs {
	owner: string;
	repo: string;
	token: string;
}

function parseArgs(argv: string[]): ParsedArgs {
	const args: Partial<ParsedArgs> = {};

	for (let i = 2; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "-o" || arg === "--owner") {
			args.owner = argv[++i];
		} else if (arg === "-r" || arg === "--repo") {
			args.repo = argv[++i];
		} else if (arg === "-t" || arg === "--token") {
			args.token = argv[++i];
		} else if (arg === "-h" || arg === "--help") {
			showHelp();
			process.exit(0);
		}
	}

	if (!args.owner || !args.repo || !args.token) {
		showHelp();
		process.exit(1);
	}

	return args as ParsedArgs;
}

function showHelp() {
	console.log("Usage: merge-queue-check [options]");
	console.log("");
	console.log("Options:");
	console.log("  -o, --owner <owner>    Required. GitHub repository owner");
	console.log("  -r, --repo <repo>      Required. GitHub repository name");
	console.log(
		"  -t, --token <token>    Required. GitHub personal access token",
	);
	console.log("  -h, --help             Show this help message");
	console.log("");
	console.log("Examples:");
	console.log("  merge-queue-check -o github -r octocat -t ghp_xxx");
}

async function checkMergeQueue(
	owner: string,
	repo: string,
	token: string,
): Promise<MergeQueueEntry[]> {
	// Use GraphQL to fetch all merge queue entries in a single request
	const query = `
    query {
      repository(owner: "${owner}", name: "${repo}") {
        mergeQueue {
          entries(first: 100) {
            nodes {
              id
              position
              state
              enqueuedAt
              pullRequest {
                number
                title
                headRefName
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  `;

	const response = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "merge-queue-check/1.0.0",
		},
		body: JSON.stringify({ query }),
	});

	if (!response.ok) {
		throw new Error(
			`GitHub API error: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as {
		data?: {
			repository?: {
				mergeQueue?: {
					entries?: {
						nodes?: Array<{
							id: string;
							position: number;
							state: string;
							enqueuedAt: string;
							pullRequest: {
								number: number;
								title: string;
								headRefName: string;
								author: {
									login: string;
								};
							};
						}>;
					};
				};
			};
		};
		errors?: Array<{ message: string }>;
	};

	if (data.errors) {
		throw new Error(`GraphQL error: ${data.errors[0].message}`);
	}

	const entries = data.data?.repository?.mergeQueue?.entries?.nodes || [];

	return entries.map((entry) => ({
		id: entry.id,
		position: entry.position,
		state: entry.state,
		pull_request: {
			number: entry.pullRequest.number,
			title: entry.pullRequest.title,
			head: {
				ref: entry.pullRequest.headRefName,
			},
			user: {
				login: entry.pullRequest.author.login,
			},
			updated_at: entry.enqueuedAt,
		},
		enqueued_at: entry.enqueuedAt,
	}));
}

const main = async () => {
	try {
		const { owner, repo, token } = parseArgs(process.argv);

		console.log(`Checking merge queue for ${owner}/${repo}...`);
		const queueEntries = await checkMergeQueue(owner, repo, token);

		if (queueEntries.length === 0) {
			notifier.notify({
				title: "✅ Merge Queue Empty",
				message: `No PRs in merge queue for ${owner}/${repo}`,
				wait: false,
				open: `https://github.com/${owner}/${repo}/queue`,
			});
			console.log("Merge queue is empty");
		} else {
			notifier.notify({
				title: "📦 Merge Queue",
				message: `${queueEntries.length} PR(s) in merge queue for ${owner}/${repo}`,
				wait: false,
				open: `https://github.com/${owner}/${repo}/queue`,
			});
			console.log(`Found ${queueEntries.length} PR(s) in merge queue:`);
			queueEntries.forEach((entry, i) => {
				console.log(
					`  ${i + 1}. #${entry.pull_request.number}: ${entry.pull_request.title}`,
				);
			});
		}
	} catch (error) {
		notifier.notify({
			title: "❌ Merge Queue Check Failed",
			message: error instanceof Error ? error.message : "Unknown error",
			wait: false,
		});
		console.error(
			"Error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		process.exit(1);
	}
};

main();
