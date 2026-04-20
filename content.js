(() => {
	const existingController = globalThis.__debugVisorController;

	if (existingController) {
		existingController.refreshFromStorage();
		return;
	}

	const STYLE_ID = "debug-visor-style";

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

	function applyOverlay(color) {
		const style = ensureStyleTag();
		style.textContent = `
			* {
				background-color: ${color} !important;
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
				enabled: false,
				color: "#ff0000",
				opacity: 1,
			},
			(result) => {
				if (!result.enabled) {
					removeOverlay();
					return;
				}

				applyOverlay(rgbaFromHex(result.color, result.opacity));
			},
		);
	}

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message?.type !== "debug-visor:ping") return;

		sendResponse({ ok: true });
	});

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "local") return;
		refreshFromStorage();
	});

	globalThis.__debugVisorController = {
		refreshFromStorage,
	};

	refreshFromStorage();
})();
