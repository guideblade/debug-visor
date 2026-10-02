// Helpers shared by the popup and the background service worker.

// The overlay is remembered per site. file:// pages have an opaque "null"
// origin, so they're grouped together by scheme.
function siteKeyFromUrl(url) {
	try {
		const { origin, protocol } = new URL(url);
		return origin === "null" ? protocol : origin;
	} catch {
		return null;
	}
}

// Tabs opened before the extension was installed or updated have no content
// script yet. Calls back with false when Chrome refuses to inject (chrome://
// pages, the Web Store and the like).
function ensureContentScript(tabId, callback = () => {}) {
	chrome.tabs.sendMessage(tabId, { type: "debug-visor:ping" }, () => {
		if (!chrome.runtime.lastError) {
			callback(true);
			return;
		}

		chrome.scripting.executeScript(
			{
				target: { tabId },
				files: ["content.js"],
			},
			() => {
				callback(!chrome.runtime.lastError);
			},
		);
	});
}

function setSiteEnabled(site, enabled, callback = () => {}) {
	chrome.storage.local.get({ sites: [] }, ({ sites }) => {
		const otherSites = sites.filter((other) => other !== site);

		chrome.storage.local.set(
			{ sites: enabled ? [...otherSites, site] : otherSites },
			callback,
		);
	});
}
