import { useEffect, useState, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { MyPullRequest } from "../types";
import { fetchMyPullRequests } from "../api/github";

interface Preferences {
  token: string;
  organizations?: string;
  excludedRepos?: string;
}

export function useMyPullRequests(filter: string) {
  const [pullRequests, setPullRequests] = useState<MyPullRequest[]>([]);
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

      const results = await fetchMyPullRequests({
        token: preferences.token,
        organizations: orgs,
        excludedRepos: excluded,
        filter,
      });

      setPullRequests(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch your pull requests"));
    } finally {
      setIsLoading(false);
    }
  }, [filter, preferences.token, preferences.organizations, preferences.excludedRepos]);

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
