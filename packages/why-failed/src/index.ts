import * as notifier from "node-notifier";

const main = async () => {
	notifier.notify({
		title: "Why Failed?",
		message: "This is a notification from the why-failed project!",
		wait: false,
		timeout: false,
	});
};

main();
