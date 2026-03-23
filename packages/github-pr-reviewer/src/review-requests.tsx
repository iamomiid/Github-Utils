import { List, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { useReviewRequests } from "./hooks/useReviewRequests";
import { PullRequestListItem } from "./components/PullRequestListItem";
import { DisplayPreferencesProvider } from "./hooks/useDisplayPreferences";

function ReviewRequestsContent() {
  const [searchText, setSearchText] = useState<string>("");
  const { pullRequests, isLoading, error, refetch } = useReviewRequests();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch review requests",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const filteredPRs = pullRequests.filter((pr) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      pr.title.toLowerCase().includes(searchLower) ||
      pr.repository.toLowerCase().includes(searchLower) ||
      pr.author.login.toLowerCase().includes(searchLower)
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by title, repository, or author..."
      throttle
    >
      {filteredPRs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No review requests"
          description="You're all caught up! No PRs are awaiting your review."
        />
      ) : (
        filteredPRs.map((pr) => (
          <PullRequestListItem key={pr.id} pr={pr} onAction={refetch} />
        ))
      )}
    </List>
  );
}

export default function ReviewRequestsCommand() {
  return (
    <DisplayPreferencesProvider>
      <ReviewRequestsContent />
    </DisplayPreferencesProvider>
  );
}
