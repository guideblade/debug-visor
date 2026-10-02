(() => {
	const existingController = globalThis.__debugVisorController;

	if (existingController) {
		existingController.refreshFromStorage();
		return;
	}

	const STYLE_ID = "debug-visor-style";
	// Must match siteKeyFromUrl() in shared.js.
	const SITE = location.origin === "null" ? location.protocol : location.origin;

	function getStyleTag() {
		return document.getElementById(STYLE_ID);
	}

	function ensureStyleTag() {
		let style = getStyleTag();

		if (!style) {
			style = document.createElement("style");
			style.id = STYLE_ID;
			document.documentElement.appendChild(style);
		}

		return style;
	}

	function removeOverlay() {
		const style = getStyleTag();
		if (style) style.remove();
	}

	function applyOverlay(color, mode) {
		const style = ensureStyleTag();
		// The negative offset keeps outlines inside each box, so they don't
		// overlap neighbours or get clipped at the viewport edge.
		const declarations = [
			mode !== "outline" && `background-color: ${color} !important;`,
			mode !== "fill" &&
				`outline: 1px solid ${color} !important; outline-offset: -1px !important;`,
		]
			.filter(Boolean)
			.join("\n");

		// A cascade layer lets the overlay win over the page's own
		// unlayered `!important` backgrounds regardless of selector specificity.
		style.textContent = `
			@layer debug-visor {
				*,
				*::before,
				*::after {
					${declarations}
				}
			}
		`;
	}

	function rgbaFromHex(hex, opacityPercent) {
		const clean = hex.replace("#", "");

		const normalized =
			clean.length === 3
				? clean
						.split("")
						.map((char) => char + char)
						.join("")
				: clean;

		const r = parseInt(normalized.slice(0, 2), 16);
		const g = parseInt(normalized.slice(2, 4), 16);
		const b = parseInt(normalized.slice(4, 6), 16);
		const a = opacityPercent / 100;

		return `rgb(${r} ${g} ${b} / ${a})`;
	}

	function refreshFromStorage() {
		chrome.storage.local.get(
			{
				sites: [],
				color: "#ff0000",
				opacity: 53,
				mode: "fill",
			},
			(result) => {
				if (!result.sites.includes(SITE)) {
					removeOverlay();
					return;
				}

				applyOverlay(rgbaFromHex(result.color, result.opacity), result.mode);
			},
		);
	}

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message?.type !== "debug-visor:ping") return;

		sendResponse({ ok: true });
	});

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "local") return;
		// This script runs in every tab, so skip the storage read while
		// dragging a slider unless the overlay is shown here or might be now.
		if (!getStyleTag() && !("sites" in changes)) return;
		refreshFromStorage();
	});

	globalThis.__debugVisorController = {
		refreshFromStorage,
	};

	refreshFromStorage();
})();
