import { List, ActionPanel, Action, Icon, Image, Color, open, showToast, Toast } from "@raycast/api";
import { PullRequest } from "../types";
import { formatDistanceToNow } from "date-fns";
import { useDisplayPreferences } from "../hooks/useDisplayPreferences";

interface PullRequestListItemProps {
  pr: PullRequest;
  onAction?: () => void;
}

export function PullRequestListItem({ pr, onAction }: PullRequestListItemProps) {
  const prefs = useDisplayPreferences();
  
  const getStatusIcon = (): Image.ImageLike => {
    switch (pr.checksStatus) {
      case "success":
        return { source: Icon.Checkmark, tintColor: Color.Green };
      case "failure":
        return { source: Icon.Xmark, tintColor: Color.Red };
      case "pending":
        return { source: Icon.Clock, tintColor: Color.Orange };
      default:
        return { source: Icon.Minus };
    }
  };

  const getReviewIcon = (): Image.ImageLike => {
    if (pr.reviewRequestType === "personal") {
      return { source: Icon.Person, tintColor: Color.Blue };
    }
    return { source: Icon.TwoPeople, tintColor: Color.Purple };
  };

  const updatedAt = formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true });

  // Build accessories array based on preferences
  const accessories: List.Item.Accessory[] = [
    {
      icon: getStatusIcon(),
      tooltip: pr.checksStatus ? `Checks: ${pr.checksStatus}` : "No checks",
    },
  ];

  if (prefs.showApprovals) {
    accessories.push({
      icon: pr.approvalsCount > 0 ? Icon.Checkmark : undefined,
      text: pr.approvalsCount > 0 ? `${pr.approvalsCount} approved` : undefined,
      tooltip: pr.approvalsCount > 0 ? `${pr.approvalsCount} approval${pr.approvalsCount === 1 ? "" : "s"}` : "No approvals",
    });
  }

  if (prefs.showLineDiff) {
    accessories.push({
      text: `${pr.additions}+/${pr.deletions}-`,
      tooltip: `+${pr.additions} / -${pr.deletions}`,
    });
  }

  if (prefs.showAuthor) {
    accessories.push({
      icon: pr.author.avatarUrl ? { source: pr.author.avatarUrl, mask: Image.Mask.Circle } : Icon.Person,
      tooltip: pr.author.login,
    });
  }

  if (prefs.showLastUpdated) {
    accessories.push({
      text: updatedAt,
      tooltip: `Updated ${updatedAt}`,
    });
  }

  return (
    <List.Item
      icon={getReviewIcon()}
      title={pr.title}
      subtitle={prefs.showRepository ? pr.repository : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={pr.url} />
            <Action.CopyToClipboard
              title="Copy PR URL"
              content={pr.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy PR Number"
              content={`#${pr.number}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Open in GitHub Desktop"
              icon={Icon.AppWindow}
              onAction={() => {
                const repoUrl = pr.url.split("/pull/")[0];
                open(`github-desktop://openRepo/${repoUrl}`);
              }}
            />
            <Action
              title="Open Repository"
              icon={Icon.Folder}
              onAction={() => {
                const repoUrl = pr.url.split("/pull/")[0];
                open(repoUrl);
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                onAction?.();
                showToast({
                  style: Toast.Style.Success,
                  title: "Refreshed",
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
