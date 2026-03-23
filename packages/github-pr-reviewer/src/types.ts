export interface PullRequestAuthor {
  login: string;
  avatarUrl: string;
}

export interface PullRequest {
  id: string;
  title: string;
  url: string;
  number: number;
  repository: string;
  author: PullRequestAuthor;
  createdAt: string;
  updatedAt: string;
  reviewRequestType: "personal" | "team";
  requestedTeams?: string[];
  isDraft: boolean;
  labels: string[];
  checksStatus: "success" | "failure" | "pending" | null;
  additions: number;
  deletions: number;
  commentsCount: number;
  approvalsCount: number;
}

export interface MyPullRequest extends PullRequest {
  status: "waiting_for_review" | "approved" | "changes_requested";
  reviewers: {
    login: string;
    state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";
  }[];
}

export interface GitHubSearchResponse {
  search: {
    edges: Array<{
      node: GitHubPullRequestNode;
    }> | null;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export interface GitHubPullRequestNode {
  id: string;
  title: string;
  url: string;
  number: number;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  repository: {
    nameWithOwner: string;
  };
  labels: {
    nodes: Array<{
      name: string;
      color: string;
    }>;
  };
  additions: number;
  deletions: number;
  comments: {
    totalCount: number;
  };
  reviewRequests: {
    nodes: Array<{
      requestedReviewer: {
        __typename: string;
        login?: string;
        name?: string;
      };
    }>;
  };
  reviews?: {
    totalCount: number;
  };
  latestOpinionatedReviews: {
    nodes: Array<{
      author: {
        login: string;
      };
      state: string;
    }>;
  };
  commits: {
    nodes: Array<{
      commit: {
        statusCheckRollup: {
          state: string;
        } | null;
      };
    }>;
  };
}
