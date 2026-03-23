import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useMyPullRequests } from "./hooks/useMyPullRequests";
import { MyPullRequestListItem } from "./components/MyPullRequestListItem";
import { MyPRFilterDropdown } from "./components/MyPRFilterDropdown";

export default function MyPullRequestsCommand() {
  const [searchText, setSearchText] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const { pullRequests, isLoading, error, refetch } = useMyPullRequests(filter);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch your pull requests",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const filteredPRs = pullRequests.filter((pr) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      pr.title.toLowerCase().includes(searchLower) ||
      pr.repository.toLowerCase().includes(searchLower)
    );
  });

  const waitForReview = filteredPRs.filter((pr) => pr.status === "waiting_for_review");
  const approved = filteredPRs.filter((pr) => pr.status === "approved");
  const changesRequested = filteredPRs.filter((pr) => pr.status === "changes_requested");

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your pull requests..."
      searchBarAccessory={<MyPRFilterDropdown onChange={setFilter} value={filter} />}
      throttle
    >
      {filteredPRs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No pull requests found"
          description="You don't have any open pull requests matching your criteria."
        />
      ) : (
        <>
          {changesRequested.length > 0 && (
            <List.Section title="Changes Requested" subtitle={`${changesRequested.length}`}>
              {changesRequested.map((pr) => (
                <MyPullRequestListItem key={pr.id} pr={pr} onAction={refetch} />
              ))}
            </List.Section>
          )}
          
          {waitForReview.length > 0 && (
            <List.Section title="Waiting for Review" subtitle={`${waitForReview.length}`}>
              {waitForReview.map((pr) => (
                <MyPullRequestListItem key={pr.id} pr={pr} onAction={refetch} />
              ))}
            </List.Section>
          )}
          
          {approved.length > 0 && (
            <List.Section title="Approved - Ready to Merge" subtitle={`${approved.length}`}>
              {approved.map((pr) => (
                <MyPullRequestListItem key={pr.id} pr={pr} onAction={refetch} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
