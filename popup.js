const enabledInput = document.getElementById("enabled");
const colorInput = document.getElementById("color");
const opacityInput = document.getElementById("opacity");
const colorPreview = document.getElementById("colorPreview");
const slider = document.querySelector(".slider");
const sliderTrack = document.querySelector(".slider__track");
const sliderFill = document.getElementById("sliderFill");
const sliderThumb = document.getElementById("sliderThumb");
const app = document.querySelector(".app");
const toggle = document.querySelector(".toggle");
const modeInputs = document.querySelectorAll(".mode__input");

const defaults = {
	color: "#ff0000",
	opacity: 53,
	mode: "fill",
};

let state = { enabled: true, ...defaults };
let activeSite = null;
let activePointerId = null;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getActiveTab(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];

		if (!tab?.id) return;

		callback(tab);
	});
}

function updateSliderVisual(opacity) {
	const min = Number(opacityInput.min);
	const max = Number(opacityInput.max);
	const boundedOpacity = clamp(opacity, min, max);
	const trackWidth = sliderTrack?.clientWidth ?? 131;
	const ratio = (boundedOpacity - min) / (max - min);

	const thumbCenter = ratio * trackWidth;
	const fillWidth = clamp(thumbCenter, 0, trackWidth);

	sliderFill.style.width = `${fillWidth}px`;
	sliderThumb.style.left = `${thumbCenter}px`;
}

function updateColorVisual(color) {
	colorPreview.style.background = color;
	document.documentElement.style.setProperty("--accent", color);
}

function updateEnabledVisual(enabled) {
	app.dataset.disabled = String(!enabled);
	colorInput.disabled = !enabled;
	opacityInput.disabled = !enabled;

	for (const input of modeInputs) {
		input.disabled = !enabled;
	}
}

function render() {
	enabledInput.checked = state.enabled;
	colorInput.value = state.color;
	opacityInput.value = String(state.opacity);

	for (const input of modeInputs) {
		input.checked = input.value === state.mode;
	}

	updateColorVisual(state.color);
	updateSliderVisual(state.opacity);
	updateEnabledVisual(state.enabled);
}

function persist(partial, callback = () => {}) {
	chrome.storage.local.set(partial, callback);
}

function setEnabled(enabled) {
	state.enabled = enabled;
	render();

	if (activeSite) setSiteEnabled(activeSite, enabled);
}

function showUnavailable() {
	app.dataset.unavailable = "true";
	enabledInput.disabled = true;
	state.enabled = false;
	render();
}

function setOpacity(opacity) {
	state.opacity = clamp(
		Math.round(opacity),
		Number(opacityInput.min),
		Number(opacityInput.max),
	);
	render();
	persist({ opacity: state.opacity });
}

function getOpacityFromPointer(clientX) {
	const rect = sliderTrack.getBoundingClientRect();
	const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

	return ratio * Number(opacityInput.max);
}

function hydrate() {
	chrome.storage.local.get(defaults, (result) => {
		state = {
			enabled: true,
			color: result.color,
			opacity: Number(result.opacity),
			mode: result.mode,
		};

		render();

		getActiveTab((tab) => {
			activeSite = siteKeyFromUrl(tab.url);

			ensureContentScript(tab.id, (isAvailable) => {
				if (!isAvailable || !activeSite) {
					showUnavailable();
					return;
				}

				// Opening the popup turns the overlay on for the current site.
				setEnabled(true);
			});
		});
	});
}

enabledInput.addEventListener("change", () => {
	setEnabled(enabledInput.checked);
});

colorInput.addEventListener("input", () => {
	state.color = colorInput.value;
	render();
	persist({ color: state.color });
});

for (const input of modeInputs) {
	input.addEventListener("change", () => {
		state.mode = input.value;
		render();
		persist({ mode: state.mode });
	});
}

opacityInput.addEventListener("input", () => {
	setOpacity(Number(opacityInput.value));
});

slider.addEventListener("pointerdown", (event) => {
	if (!state.enabled) return;

	activePointerId = event.pointerId;
	slider.setPointerCapture(event.pointerId);
	setOpacity(getOpacityFromPointer(event.clientX));
});

slider.addEventListener("pointermove", (event) => {
	if (activePointerId !== event.pointerId) return;
	setOpacity(getOpacityFromPointer(event.clientX));
});

function releaseSliderPointer(event) {
	if (activePointerId !== event.pointerId) return;
	activePointerId = null;

	if (slider.hasPointerCapture(event.pointerId)) {
		slider.releasePointerCapture(event.pointerId);
	}
}

slider.addEventListener("pointerup", releaseSliderPointer);
slider.addEventListener("pointercancel", releaseSliderPointer);

function showShortcutHint() {
	chrome.commands.getAll((commands) => {
		const shortcut = commands.find(
			(command) => command.name === "toggle-overlay",
		)?.shortcut;

		if (shortcut) toggle.title = `Toggle with ${shortcut}`;
	});
}

hydrate();
showShortcutHint();
