importScripts("shared.js");

chrome.runtime.onInstalled.addListener(() => {
	// Up to 1.1 a single global switch was stored; it's per site now.
	chrome.storage.local.remove("enabled");
});

chrome.commands.onCommand.addListener((command, tab) => {
	if (command !== "toggle-overlay" || !tab?.id) return;

	const site = siteKeyFromUrl(tab.url);
	if (!site) return;

	ensureContentScript(tab.id, (isAvailable) => {
		if (!isAvailable) return;

		chrome.storage.local.get({ sites: [] }, ({ sites }) => {
			setSiteEnabled(site, !sites.includes(site));
		});
	});
});
