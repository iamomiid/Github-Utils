import { MenuBarExtra, open, Icon } from "@raycast/api";
import { useReviewRequests } from "./hooks/useReviewRequests";

export default function MenuBarCommand() {
	const { pullRequests, isLoading, error } = useReviewRequests();
	const totalCount = pullRequests.length;

	if (error) {
		return (
			<MenuBarExtra icon={Icon.Warning} tooltip="Error loading review requests">
				<MenuBarExtra.Item title="Error loading data" onAction={() => {}} />
			</MenuBarExtra>
		);
	}

	return (
		<MenuBarExtra
			icon={totalCount === 0 ? Icon.Checkmark : Icon.Bell}
			title={totalCount > 0 ? String(totalCount) : undefined}
			tooltip={`${totalCount} review request${totalCount === 1 ? "" : "s"}`}
			isLoading={isLoading}
		>
			{totalCount === 0 ? (
				<MenuBarExtra.Item title="No review requests" icon={Icon.Checkmark} />
			) : (
				<>
					<MenuBarExtra.Section>
						<MenuBarExtra.Item
							title={`${totalCount} Review Request${totalCount === 1 ? "" : "s"}`}
							icon={Icon.Bell}
						/>
					</MenuBarExtra.Section>

					<MenuBarExtra.Section>
						{pullRequests.slice(0, 10).map((pr) => (
							<MenuBarExtra.Item
								key={pr.id}
								title={pr.title}
								subtitle={pr.repository}
								onAction={() => open(pr.url)}
							/>
						))}
						{pullRequests.length > 10 && (
							<MenuBarExtra.Item
								title={`... and ${pullRequests.length - 10} more`}
								icon={Icon.Ellipsis}
							/>
						)}
					</MenuBarExtra.Section>

					<MenuBarExtra.Section>
						<MenuBarExtra.Item
							title="Open All Review Requests"
							icon={Icon.AppWindowList}
							onAction={() =>
								open("raycast://extensions//github-pr-reviewer/review-requests")
							}
						/>
					</MenuBarExtra.Section>
				</>
			)}
		</MenuBarExtra>
	);
}
