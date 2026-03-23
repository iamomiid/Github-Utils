import { useEffect, useState, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { PullRequest } from "../types";
import { fetchReviewRequests } from "../api/github";

interface Preferences {
  token: string;
  organizations?: string;
  excludedRepos?: string;
}

export function useReviewRequests() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const orgs = preferences.organizations
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

      const excluded = preferences.excludedRepos
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

      const results = await fetchReviewRequests({
        token: preferences.token,
        organizations: orgs,
        excludedRepos: excluded,
      });

      setPullRequests(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch review requests"));
    } finally {
      setIsLoading(false);
    }
  }, [preferences.token, preferences.organizations, preferences.excludedRepos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    pullRequests,
    isLoading,
    error,
    refetch: fetchData,
  };
}
