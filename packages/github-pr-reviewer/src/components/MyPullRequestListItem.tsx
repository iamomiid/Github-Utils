import { List, ActionPanel, Action, Icon, Image, Color } from "@raycast/api";
import { MyPullRequest } from "../types";
import { formatDistanceToNow } from "date-fns";

interface MyPullRequestListItemProps {
  pr: MyPullRequest;
  onAction?: () => void;
}

export function MyPullRequestListItem({ pr, onAction }: MyPullRequestListItemProps) {
  const getStatusIcon = (): Image.ImageLike => {
    switch (pr.status) {
      case "approved":
        return { source: Icon.Checkmark, tintColor: Color.Green };
      case "changes_requested":
        return { source: Icon.Xmark, tintColor: Color.Red };
      case "waiting_for_review":
        return { source: Icon.Clock, tintColor: Color.Orange };
      default:
        return { source: Icon.Minus };
    }
  };

  const getStatusText = (): string => {
    switch (pr.status) {
      case "approved":
        return "Approved";
      case "changes_requested":
        return "Changes Requested";
      case "waiting_for_review":
        return "Waiting for Review";
      default:
        return "Unknown";
    }
  };

  const approvedCount = pr.reviewers.filter((r) => r.state === "APPROVED").length;
  const changesCount = pr.reviewers.filter((r) => r.state === "CHANGES_REQUESTED").length;

  const updatedAt = formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true });

  return (
    <List.Item
      icon={getStatusIcon()}
      title={pr.title}
      subtitle={pr.repository}
      accessories={[
        {
          icon: getStatusIcon(),
          tooltip: getStatusText(),
        },
        {
          text: approvedCount > 0 ? `${approvedCount} approved` : undefined,
          icon: approvedCount > 0 ? Icon.Checkmark : undefined,
          tooltip: approvedCount > 0 ? `${approvedCount} approval${approvedCount === 1 ? "" : "s"}` : undefined,
        },
        {
          text: changesCount > 0 ? `${changesCount} changes` : undefined,
          icon: changesCount > 0 ? Icon.Xmark : undefined,
          tooltip: changesCount > 0 ? `${changesCount} changes requested` : undefined,
        },
        {
          text: updatedAt,
          tooltip: `Updated ${updatedAt}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={pr.url} />
            <Action.CopyToClipboard
              title="Copy PR URL"
              content={pr.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onAction}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
