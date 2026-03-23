#!/usr/bin/env node
/**
 * workflow-running - A CLI tool to check for running GitHub workflow runs
 *
 * Usage: workflow-running -o <owner> -r <repo> -t <token> [-w <workflow-id>]
 *
 * This tool checks if there are any running/in-progress workflow runs and sends a notification.
 */
import * as notifier from "node-notifier";

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  run_number: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  event: string;
}

interface WorkflowRunsResponse {
  total_count: number;
  workflow_runs: WorkflowRun[];
}

interface ParsedArgs {
  owner: string;
  repo: string;
  token: string;
  workflowId?: string;
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
    } else if (arg === "-w" || arg === "--workflow") {
      args.workflowId = argv[++i];
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
  console.log("Usage: workflow-running [options]");
  console.log("");
  console.log("Options:");
  console.log("  -o, --owner <owner>       Required. GitHub repository owner");
  console.log("  -r, --repo <repo>         Required. GitHub repository name");
  console.log("  -t, --token <token>       Required. GitHub personal access token");
  console.log("  -w, --workflow <id>       Optional. Workflow ID or filename to filter by");
  console.log("  -h, --help                Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  workflow-running -o github -r octocat -t ghp_xxx");
  console.log("  workflow-running -o github -r octocat -t ghp_xxx -w ci.yml");
  console.log("  workflow-running -o github -r octocat -t ghp_xxx -w 12345678");
}

async function fetchRunningWorkflows(
  owner: string,
  repo: string,
  token: string,
  workflowId?: string
): Promise<WorkflowRun[]> {
  let url: string;
  
  if (workflowId) {
    url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?status=in_progress&per_page=100`;
  } else {
    url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=in_progress&per_page=100`;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "workflow-running/1.0.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as WorkflowRunsResponse;
  return data.workflow_runs;
}

const main = async () => {
  try {
    const { owner, repo, token, workflowId } = parseArgs(process.argv);

    console.log(`Checking for running workflows in ${owner}/${repo}...`);
    
    if (workflowId) {
      console.log(`  Filtering by workflow: ${workflowId}`);
    }

    const runningWorkflows = await fetchRunningWorkflows(owner, repo, token, workflowId);

    if (runningWorkflows.length === 0) {
      notifier.notify({
        title: "✅ No Running Workflows",
        message: `No workflows currently running in ${owner}/${repo}`,
        wait: false,
      });
      console.log("No workflows currently running");
    } else {
      // Sort by updated_at to find the latest run
      const sortedWorkflows = [...runningWorkflows].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const latestRun = sortedWorkflows[0];
      
      notifier.notify({
        title: "🔄 Workflows Running",
        message: `${runningWorkflows.length} workflow run(s) in progress for ${owner}/${repo}`,
        wait: false,
        open: latestRun.html_url,
      });
      
      console.log(`Found ${runningWorkflows.length} running workflow(s):`);
      
      runningWorkflows.forEach((workflow, i) => {
        console.log(`  ${i + 1}. ${workflow.name} (#${workflow.run_number})`);
        console.log(`     Branch: ${workflow.head_branch}`);
        console.log(`     Started: ${workflow.created_at}`);
        console.log(`     URL: ${workflow.html_url}`);
        console.log("");
      });
    }
  } catch (error) {
    notifier.notify({
      title: "❌ Workflow Check Failed",
      message: error instanceof Error ? error.message : "Unknown error",
      wait: false,
    });
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
};

main();
