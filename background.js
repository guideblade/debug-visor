function injectContentScript(tabId) {
	chrome.scripting.executeScript(
		{
			target: { tabId },
			files: ["content.js"],
		},
		() => {
			void chrome.runtime.lastError;
		},
	);
}

chrome.commands.onCommand.addListener((command, tab) => {
	if (command !== "toggle-overlay" || !tab?.id) return;

	chrome.tabs.sendMessage(tab.id, { type: "debug-visor:ping" }, () => {
		// On a tab the visor hasn't reached yet, the shortcut should show the
		// overlay there rather than switch it off everywhere else.
		const isInjected = !chrome.runtime.lastError;

		chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
			const nextEnabled = isInjected ? !enabled : true;

			chrome.storage.local.set({ enabled: nextEnabled }, () => {
				if (nextEnabled && !isInjected) {
					injectContentScript(tab.id);
				}
			});
		});
	});
});
