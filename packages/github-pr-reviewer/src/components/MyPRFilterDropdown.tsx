import { List } from "@raycast/api";

interface MyPRFilterDropdownProps {
  onChange: (value: string) => void;
  value: string;
}

export function MyPRFilterDropdown({ onChange, value }: MyPRFilterDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Filter by status"
      value={value}
      onChange={onChange}
    >
      <List.Dropdown.Item title="All My PRs" value="all" />
      <List.Dropdown.Item title="Waiting for Review" value="waiting_for_review" />
      <List.Dropdown.Item title="Approved" value="approved" />
      <List.Dropdown.Item title="Changes Requested" value="changes_requested" />
    </List.Dropdown>
  );
}
