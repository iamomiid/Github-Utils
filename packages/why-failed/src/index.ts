#!/usr/bin/env node
/**
 * why-failed - A CLI tool to investigate failed GitHub workflow runs
 *
 * Usage: why-failed -w <workflow-url> -t <token> [-a <prefix>] [-g <agent>]
 *
 * This tool:
 * 1. Downloads workflow artifacts
 * 2. Fetches failed job logs
 * 3. Generates a markdown report
 * 4. Analyzes with AI agent (optional)
 * 5. Sends notification with results
 */
import * as notifier from "node-notifier";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { execSync } from "child_process";

interface WorkflowRunUrl {
	owner: string;
	repo: string;
	runId: string;
}

interface Job {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	html_url: string;
	started_at: string;
	completed_at: string | null;
}

interface JobsResponse {
	total_count: number;
	jobs: Job[];
}

interface WorkflowRun {
	id: number;
	conclusion: string | null;
	status: string;
}

interface FailedJobWithLogs {
	job: Job;
	logs: string;
}

interface Artifact {
	id: number;
	name: string;
	size_in_bytes: number;
	archive_download_url: string;
	created_at: string;
}

interface ArtifactsResponse {
	total_count: number;
	artifacts: Artifact[];
}

function parseWorkflowUrl(url: string): WorkflowRunUrl {
	const match = url.match(
		/github\.com\/([^\/]+)\/([^\/]+)\/actions\/runs\/(\d+)/,
	);
	if (!match) {
		throw new Error("Invalid GitHub workflow URL format");
	}
	const [, owner, repo, runId] = match;
	return { owner, repo, runId };
}

async function fetchWorkflowRun(
	owner: string,
	repo: string,
	runId: string,
	token: string,
): Promise<WorkflowRun> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
		{
			headers: {
				Accept: "application/vnd.github.v3+json",
				Authorization: `Bearer ${token}`,
				"User-Agent": "why-failed/1.0.0",
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			`GitHub API error: ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as WorkflowRun;
}

async function fetchAllJobs(
	owner: string,
	repo: string,
	runId: string,
	token: string,
): Promise<Job[]> {
	const allJobs: Job[] = [];
	let page = 1;
	const perPage = 100;
	let hasMore = true;

	while (hasMore) {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=${perPage}&page=${page}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `Bearer ${token}`,
					"User-Agent": "why-failed/1.0.0",
				},
			},
		);

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as JobsResponse;
		allJobs.push(...data.jobs);

		hasMore = data.jobs.length === perPage;
		page++;
	}

	return allJobs;
}

async function fetchFailedJobs(
	owner: string,
	repo: string,
	runId: string,
	token: string,
): Promise<Job[]> {
	const allJobs = await fetchAllJobs(owner, repo, runId, token);
	console.log(`  Total jobs: ${allJobs.length}`);

	return allJobs.filter(
		(job) => job.conclusion === "failure" || job.conclusion === "cancelled",
	);
}

async function fetchJobLogs(
	owner: string,
	repo: string,
	jobId: number,
	token: string,
): Promise<string> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
		{
			headers: {
				Accept: "application/vnd.github.v3+json",
				Authorization: `Bearer ${token}`,
				"User-Agent": "why-failed/1.0.0",
			},
		},
	);

	if (!response.ok) {
		if (response.status === 404) {
			return "*Logs not available (may have expired or job is still running)*";
		}
		throw new Error(
			`Failed to fetch logs: ${response.status} ${response.statusText}`,
		);
	}

	return await response.text();
}

async function fetchFailedJobLogs(
	owner: string,
	repo: string,
	failedJobs: Job[],
	token: string,
): Promise<FailedJobWithLogs[]> {
	const results: FailedJobWithLogs[] = [];

	for (const job of failedJobs) {
		try {
			const logs = await fetchJobLogs(owner, repo, job.id, token);
			results.push({ job, logs });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			results.push({
				job,
				logs: `*Failed to fetch logs: ${errorMessage}*`,
			});
		}
	}

	return results;
}

async function fetchArtifacts(
	owner: string,
	repo: string,
	runId: string,
	token: string,
): Promise<Artifact[]> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
		{
			headers: {
				Accept: "application/vnd.github.v3+json",
				Authorization: `Bearer ${token}`,
				"User-Agent": "why-failed/1.0.0",
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			`GitHub API error: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as ArtifactsResponse;
	return data.artifacts;
}

async function downloadArtifact(
	artifact: Artifact,
	token: string,
	outputPath: string,
): Promise<void> {
	const response = await fetch(artifact.archive_download_url, {
		headers: {
			Authorization: `Bearer ${token}`,
			"User-Agent": "why-failed/1.0.0",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to download artifact: ${response.status} ${response.statusText}`,
		);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	fs.writeFileSync(outputPath, buffer);
}

async function downloadArtifacts(
	artifacts: Artifact[],
	token: string,
	outputDir: string,
): Promise<
	{
		artifact: Artifact;
		filename: string;
		extractDir: string;
		success: boolean;
		error?: string;
	}[]
> {
	const results = [];

	for (const artifact of artifacts) {
		const safeName = artifact.name.replace(/[^a-zA-Z0-9\-_]/g, "_");
		const filename = `${safeName}-${artifact.id}.zip`;
		const outputPath = path.join(outputDir, filename);
		const extractDir = path.join(outputDir, `${safeName}-${artifact.id}`);

		try {
			console.log(
				`  Downloading artifact: ${artifact.name} (${(artifact.size_in_bytes / 1024).toFixed(1)} KB)...`,
			);
			await downloadArtifact(artifact, token, outputPath);

			console.log(`    Extracting: ${filename}...`);
			const zip = new AdmZip(outputPath);
			zip.extractAllTo(extractDir, true);

			// Remove the zip file after extraction
			fs.unlinkSync(outputPath);

			results.push({ artifact, filename, extractDir, success: true });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			results.push({
				artifact,
				filename,
				extractDir,
				success: false,
				error: errorMessage,
			});
		}
	}

	return results;
}

function listDirectoryContents(dirPath: string, prefix = ""): string[] {
	const results: string[] = [];

	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

			if (entry.isDirectory()) {
				results.push(`${relativePath}/`);
				results.push(...listDirectoryContents(fullPath, relativePath));
			} else {
				const stats = fs.statSync(fullPath);
				const size = (stats.size / 1024).toFixed(1);
				results.push(`${relativePath} (${size} KB)`);
			}
		}
	} catch (error) {
		results.push(
			`*Error reading directory: ${error instanceof Error ? error.message : "Unknown error"}*`,
		);
	}

	return results;
}

async function analyzeWithAgent(
	reportPath: string,
	dirPath: string,
	agentCommand: string,
): Promise<{ htmlPath: string } | null> {
	try {
		console.log(`Analyzing with agent: ${agentCommand}...`);

		// Check if agent is available
		try {
			const agentName = agentCommand.split(" ")[0];
			execSync(`which ${agentName}`, { stdio: "ignore" });
		} catch {
			console.log(
				`  ${agentCommand.split(" ")[0]} not available, skipping AI analysis`,
			);
			return null;
		}

		// Define the expected output path
		const htmlPath = path.join(dirPath, "analysis.html");

		// Create a prompt file for codex
		const promptPath = path.join(dirPath, "codex-instructions.txt");
		const instructions = `Read the file at "${reportPath}" which contains a GitHub workflow failure report.

IMPORTANT: Also explore the "${dirPath}" directory to see what artifacts were downloaded. Look at:
- Any extracted artifact directories
- HTML reports, test results, screenshots, or other files
- Any error logs or diagnostic files

Use this additional context from the artifacts to get the full picture of why the workflow failed.

Analyze everything and create an HTML file at "${htmlPath}" that includes:

1. A professional summary of what went wrong
2. Root cause analysis based on both the report and artifacts
3. Whether it's safe to retry the workflow
4. Overall verdict with clear recommendation

The HTML should be well-styled with:
- Clean, modern design similar to GitHub's interface
- Color-coded verdict section (green for safe to retry, yellow for caution, red for do not retry)
- Proper typography and spacing
- Responsive layout

Use file write to create the HTML file. Return the path to the created file when done.`;

		fs.writeFileSync(promptPath, instructions, "utf-8");

		// Call agent with the instructions file
		execSync(`${agentCommand} < "${promptPath}"`, {
			encoding: "utf-8",
			timeout: 300000,
			maxBuffer: 1024 * 1024,
			cwd: dirPath,
		});

		// Clean up instructions file
		fs.unlinkSync(promptPath);

		// Check if HTML was created
		if (fs.existsSync(htmlPath)) {
			console.log(`  Analysis saved to: ${htmlPath}`);
			return { htmlPath };
		} else {
			console.log("  Codex did not create the HTML file");
			return null;
		}
	} catch (error) {
		console.error(
			"  Error analyzing with Codex:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return null;
	}
}

function generateMarkdownReport(
	owner: string,
	repo: string,
	runId: string,
	workflowUrl: string,
	workflowRun: WorkflowRun,
	failedJobs: FailedJobWithLogs[],
	artifacts: Artifact[],
	downloadedArtifacts: {
		artifact: Artifact;
		filename: string;
		extractDir: string;
		success: boolean;
		error?: string;
	}[],
): string {
	const timestamp = new Date().toISOString();

	let markdown = `# Workflow Failure Report

**Repository:** ${owner}/${repo}  
**Run ID:** ${runId}  
**Workflow URL:** ${workflowUrl}  
**Workflow Status:** ${workflowRun.status}  
**Workflow Conclusion:** ${workflowRun.conclusion || "N/A"}  
**Generated:** ${timestamp}

---

`;

	if (failedJobs.length === 0) {
		markdown += `ℹ️ **No failed jobs found!** (Workflow conclusion: ${workflowRun.conclusion})\n\n`;
	} else {
		markdown += `## Failed Jobs (${failedJobs.length})\n\n`;

		failedJobs.forEach(({ job, logs }, index) => {
			markdown += `### ${index + 1}. ${job.name}\n\n`;
			markdown += `- **Status:** ${job.conclusion?.toUpperCase() || job.status}\n`;
			markdown += `- **Started:** ${job.started_at}\n`;
			markdown += `- **Job URL:** ${job.html_url}\n\n`;
			markdown += `<details>\n<summary>View Logs</summary>\n\n\`\`\`text\n${logs}\n\`\`\`\n\n</details>\n\n`;
			markdown += "---\n\n";
		});
	}

	if (artifacts.length > 0) {
		markdown += `\n## Artifacts (${artifacts.length})\n\n`;

		downloadedArtifacts.forEach(
			({ artifact, filename, extractDir, success, error }) => {
				markdown += `### ${artifact.name}\n\n`;
				markdown += `- **Size:** ${(artifact.size_in_bytes / 1024).toFixed(1)} KB\n`;
				markdown += `- **Created:** ${artifact.created_at}\n`;

				if (success) {
					const dirName = path.basename(extractDir);
					markdown += `- **Extracted to:** [${dirName}/](./${dirName}/)\n`;

					// List contents
					const contents = listDirectoryContents(extractDir);
					if (contents.length > 0) {
						markdown += `- **Contents:**\n`;
						contents.forEach((item) => {
							markdown += `  - ${item}\n`;
						});
					}
				} else {
					markdown += `- **Status:** Failed - ${error}\n`;
				}

				markdown += "\n";
			},
		);
	}

	return markdown;
}

function createReportDirectory(
	owner: string,
	repo: string,
	runId: string,
): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const dirName = `workflow-failure-${owner}-${repo}-${runId}-${timestamp}`;
	const dirPath = path.join("/tmp", dirName);

	fs.mkdirSync(dirPath, { recursive: true });

	return dirPath;
}

interface ParsedArgs {
	workflowUrl: string;
	githubToken: string;
	artifactPrefix?: string;
	agent?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
	const args: Partial<ParsedArgs> = {};

	for (let i = 2; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "-w" || arg === "--workflow-url") {
			args.workflowUrl = argv[++i];
		} else if (arg === "-t" || arg === "--token" || arg === "--github-token") {
			args.githubToken = argv[++i];
		} else if (arg === "-a" || arg === "--artifact-prefix") {
			args.artifactPrefix = argv[++i];
		} else if (arg === "-g" || arg === "--agent") {
			args.agent = argv[++i];
		} else if (arg === "-h" || arg === "--help") {
			showHelp();
			process.exit(0);
		}
	}

	if (!args.workflowUrl || !args.githubToken) {
		showHelp();
		process.exit(1);
	}

	return args as ParsedArgs;
}

function showHelp() {
	console.log("Usage: why-failed [options]");
	console.log("");
	console.log("Options:");
	console.log(
		"  -w, --workflow-url <url>       Required. GitHub workflow run URL",
	);
	console.log(
		"  -t, --token <token>            Required. GitHub personal access token",
	);
	console.log(
		"  -a, --artifact-prefix <prefix> Optional. Only download artifacts starting with prefix",
	);
	console.log(
		"  -g, --agent <command>          Optional. Custom coding agent command (default: codex)",
	);
	console.log("  -h, --help                     Show this help message");
	console.log("");
	console.log("Examples:");
	console.log(
		"  why-failed -w https://github.com/owner/repo/actions/runs/123 -t ghp_xxx",
	);
	console.log(
		"  why-failed --workflow-url https://github.com/owner/repo/actions/runs/123 --token ghp_xxx -a playwright",
	);
	console.log(
		"  why-failed -w https://github.com/owner/repo/actions/runs/123 -t ghp_xxx -g 'openai run'",
	);
}

const main = async () => {
	try {
		const {
			workflowUrl: url,
			githubToken: token,
			artifactPrefix,
			agent = "codex exec --full-auto --skip-git-repo-check",
		} = parseArgs(process.argv);

		if (artifactPrefix) {
			console.log(`Artifact filter: ${artifactPrefix}*`);
		}

		const { owner, repo, runId } = parseWorkflowUrl(url);

		console.log("Fetching workflow run info...");
		const workflowRun = await fetchWorkflowRun(owner, repo, runId, token);
		console.log(
			`  Workflow status: ${workflowRun.status}, conclusion: ${workflowRun.conclusion}`,
		);

		console.log("Creating report directory...");
		const reportDir = createReportDirectory(owner, repo, runId);
		console.log(`  Directory: ${reportDir}`);

		console.log("Fetching artifacts...");
		let artifacts = await fetchArtifacts(owner, repo, runId, token);

		if (artifactPrefix) {
			artifacts = artifacts.filter((a) => a.name.startsWith(artifactPrefix));
			console.log(
				`  Found ${artifacts.length} artifact(s) matching prefix "${artifactPrefix}"`,
			);
		} else {
			console.log(`  Found ${artifacts.length} artifact(s)`);
		}

		console.log("Downloading artifacts...");
		const downloadedArtifacts = await downloadArtifacts(
			artifacts,
			token,
			reportDir,
		);
		const successfulDownloads = downloadedArtifacts.filter(
			(a) => a.success,
		).length;
		console.log(
			`  Downloaded ${successfulDownloads}/${artifacts.length} artifact(s)`,
		);

		console.log("Fetching all jobs...");
		const failedJobs = await fetchFailedJobs(owner, repo, runId, token);
		console.log(`  Failed jobs: ${failedJobs.length}`);

		let jobsWithLogs: FailedJobWithLogs[] = [];
		if (failedJobs.length > 0) {
			console.log("Fetching logs for failed jobs...");
			jobsWithLogs = await fetchFailedJobLogs(owner, repo, failedJobs, token);
		}

		console.log("Generating report...");
		const markdown = generateMarkdownReport(
			owner,
			repo,
			runId,
			url,
			workflowRun,
			jobsWithLogs,
			artifacts,
			downloadedArtifacts,
		);

		const reportPath = path.join(reportDir, "report.md");
		fs.writeFileSync(reportPath, markdown, "utf-8");

		// Analyze with agent
		let htmlPath: string | null = null;
		if (failedJobs.length > 0 || workflowRun.conclusion === "failure") {
			const analysisResult = await analyzeWithAgent(
				reportPath,
				reportDir,
				agent,
			);
			if (analysisResult) {
				htmlPath = analysisResult.htmlPath;
			}
		}

		const isFailure =
			failedJobs.length > 0 ||
			workflowRun.conclusion === "failure" ||
			workflowRun.conclusion === "cancelled";

		if (!isFailure) {
			notifier.notify({
				title: "✅ Workflow Successful",
				message: `No failed jobs in ${owner}/${repo}`,
				wait: false,
			});
		} else {
			const message = `${failedJobs.length} job(s) failed`;

			const notifyOptions: any = {
				title: `❌ Failed: ${owner}/${repo}`,
				message,
				wait: false,
			};

			if (htmlPath) {
				notifyOptions.open = `file://${htmlPath}`;
			}

			notifier.notify(notifyOptions);
		}

		console.log("\n✓ Report complete!");
		console.log(`  Directory: ${reportDir}`);
		console.log(`  Report: ${reportPath}`);
		if (htmlPath) {
			console.log(`  Analysis: ${htmlPath}`);
		}
		if (artifacts.length > 0) {
			console.log(
				`  Artifacts: ${successfulDownloads}/${artifacts.length} downloaded`,
			);
		}
	} catch (error) {
		notifier.notify({
			title: "❌ Why Failed?",
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
