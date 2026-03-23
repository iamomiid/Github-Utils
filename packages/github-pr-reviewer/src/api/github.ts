import { PullRequest, MyPullRequest, GitHubSearchResponse, GitHubPullRequestNode } from "../types";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

interface FetchOptions {
  token: string;
  includeTeams?: boolean;
  organizations?: string[];
  excludedRepos?: string[];
  filter?: string;
}

function getStatusFromCheckState(state: string | null): "success" | "failure" | "pending" | null {
  if (!state) return null;
  if (state === "SUCCESS") return "success";
  if (state === "FAILURE" || state === "ERROR") return "failure";
  if (state === "PENDING") return "pending";
  return null;
}

function mapPullRequest(node: GitHubPullRequestNode, reviewRequestType: "personal" | "team"): PullRequest {
  const requestedTeams = node.reviewRequests?.nodes
    ?.filter((r) => r.requestedReviewer?.__typename === "Team")
    .map((r) => r.requestedReviewer?.name || "")
    .filter(Boolean) || [];

  return {
    id: node.id,
    title: node.title,
    url: node.url,
    number: node.number,
    repository: node.repository?.nameWithOwner || "",
    author: {
      login: node.author?.login || "unknown",
      avatarUrl: node.author?.avatarUrl || "",
    },
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    reviewRequestType,
    requestedTeams: requestedTeams.length > 0 ? requestedTeams : undefined,
    isDraft: node.isDraft,
    labels: node.labels?.nodes?.map((l) => l.name) || [],
    checksStatus: getStatusFromCheckState(node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state || null),
    additions: node.additions || 0,
    deletions: node.deletions || 0,
    commentsCount: node.comments?.totalCount || 0,
    approvalsCount: node.reviews?.totalCount || 0,
  };
}

export async function fetchReviewRequests(options: FetchOptions): Promise<PullRequest[]> {
  const { token, organizations = [], excludedRepos = [] } = options;

  // Simple query: all PRs where @me is requested to review (personal or team)
  const query = buildReviewRequestQuery(organizations, excludedRepos, "@me");
  console.log("Review requests query:", query);
  
  const results = await executeSearch(token, query);
  console.log("Review requests found:", results.length);

    // Sort by updatedAt, most recent first
  return results
    .map((node) => mapPullRequest(node, "personal"))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function buildReviewRequestQuery(
  organizations: string[],
  excludedRepos: string[],
  reviewer?: string
): string {
  let query = "is:open is:pr draft:false";

  if (reviewer) {
    query += ` review-requested:${reviewer}`;
  }

  if (organizations.length > 0) {
    const orgQuery = organizations.map((org) => `org:${org}`).join(" ");
    query += ` ${orgQuery}`;
  }

  for (const repo of excludedRepos) {
    query += ` -repo:${repo}`;
  }

  return query;
}

async function executeSearch(token: string, query: string): Promise<GitHubPullRequestNode[]> {
  console.log("Executing search with query:", query);
  
  const graphqlQuery = `
    query SearchReviewRequests($query: String!) {
      search(query: $query, type: ISSUE, first: 100) {
        edges {
          node {
            ... on PullRequest {
              id
              title
              url
              number
              isDraft
              createdAt
              updatedAt
              author {
                login
                avatarUrl
              }
              repository {
                nameWithOwner
              }
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              additions
              deletions
              comments {
                totalCount
              }
              reviewRequests(first: 10) {
                nodes {
                  requestedReviewer {
                    __typename
                    ... on User {
                      login
                    }
                    ... on Team {
                      name
                    }
                  }
                }
              }
              commits(last: 1) {
                nodes {
                  commit {
                    statusCheckRollup {
                      state
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { query },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json() as {
    data?: GitHubSearchResponse;
    errors?: Array<{ message: string }>;
  };

  if (data.errors) {
    throw new Error(data.errors[0]?.message || "GraphQL error");
  }

  return data.data?.search?.edges?.map((edge) => edge.node) || [];
}

export async function fetchMyPullRequests(options: FetchOptions): Promise<MyPullRequest[]> {
  const { token, organizations = [], excludedRepos = [], filter = "all" } = options;

  let query = "is:open is:pr author:@me";

  if (organizations.length > 0) {
    const orgQuery = organizations.map((org) => `org:${org}`).join(" ");
    query += ` ${orgQuery}`;
  }

  for (const repo of excludedRepos) {
    query += ` -repo:${repo}`;
  }

  const results = await executeSearch(token, query);

  const mappedPRs: MyPullRequest[] = results.map((node) => {
    const basePR = mapPullRequest(node, "personal");

    const reviewers = node.latestOpinionatedReviews?.nodes?.map((review) => ({
      login: review.author?.login || "",
      state: review.state as "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING",
    })) || [];

    let status: MyPullRequest["status"] = "waiting_for_review";
    if (reviewers.some((r) => r.state === "CHANGES_REQUESTED")) {
      status = "changes_requested";
    } else if (reviewers.some((r) => r.state === "APPROVED")) {
      status = "approved";
    }

    return {
      ...basePR,
      status,
      reviewers,
    };
  });

  // Apply filter
  if (filter !== "all") {
    return mappedPRs.filter((pr) => pr.status === filter);
  }

  return mappedPRs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
