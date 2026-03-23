/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Personal Access Token - GitHub token with 'repo' scope (required). Add 'read:org' scope for team review requests. */
  "token": string,
  /** Include Team Review Requests - Show PRs where your teams are requested (requires 'read:org' scope on token) */
  "includeTeams": boolean,
  /** Default Filter - Default filter to apply when opening the extension */
  "defaultFilter": "all" | "personal" | "team" | "repo",
  /** Organizations - Comma-separated list of organizations to filter by (leave empty for all) */
  "organizations"?: string,
  /** Excluded Repositories - Comma-separated list of repositories to exclude (format: owner/repo) */
  "excludedRepos"?: string,
  /** Show Repository Name - Display the repository name in the PR list */
  "showRepository": boolean,
  /** Show Author - Display the PR author's avatar */
  "showAuthor": boolean,
  /** Show Last Updated - Display when the PR was last updated */
  "showLastUpdated": boolean,
  /** Show Line Diff - Display the number of lines added/removed */
  "showLineDiff": boolean,
  /** Show Approval Count - Display the number of approvals (requires additional API calls) */
  "showApprovals": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `review-requests` command */
  export type ReviewRequests = ExtensionPreferences & {}
  /** Preferences accessible in the `my-pull-requests` command */
  export type MyPullRequests = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `review-requests` command */
  export type ReviewRequests = {}
  /** Arguments passed to the `my-pull-requests` command */
  export type MyPullRequests = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
}

