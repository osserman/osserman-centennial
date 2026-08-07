// Validated against the dataviz skill's default palette
// (node scripts/validate_palette.js from the skill's own reference instance).
//
// This is a dense scatter-like graph (~1,033 simultaneously-visible nodes),
// which the skill treats as an "all-pairs" case: only the first 3 categorical
// slots (blue/orange/aqua) validate for CVD + normal-vision separation when
// many colored points can appear adjacent at once. A 4th simultaneous hue
// (yellow) fails the normal-vision floor under that regime, so the 4th
// "pathway" category below is distinguished by marker shape (a ring) instead
// of a competing hue, not by adding a 4th color.
//
// Both light and dark steps are the skill's own validated dark-mode steps,
// not an automatic flip.

export const palette = {
	light: {
		surface: '#fcfcfb',
		textPrimary: '#0b0b0b',
		textSecondary: '#52514e',
		muted: '#898781', // unhighlighted nodes — deliberately mode-invariant
		blue: '#2a78d6', // slot 1
		orange: '#eb6834', // slot 2
		aqua: '#1baf7a' // slot 3
	},
	dark: {
		surface: '#1a1a19',
		textPrimary: '#ffffff',
		textSecondary: '#c3c2b7',
		muted: '#898781',
		blue: '#3987e5',
		orange: '#d95926',
		aqua: '#199e70'
	}
};

// Semantic role assignments, mapped onto the validated slots above.
export const roles = {
	math: 'blue',
	nonMath: 'orange',
	pathway: {
		hidden_structure: 'blue',
		design_language: 'orange',
		computational_tool: 'aqua',
		// 4th pathway: shares a validated hue (blue) but is drawn as a ring
		// (see CitationGraph's marker shape logic), not a 4th competing color.
		physical_theory: 'blue'
	}
};

export const pathwayShape = {
	hidden_structure: 'dot',
	design_language: 'dot',
	computational_tool: 'dot',
	physical_theory: 'ring'
};

export function activePalette(themeOverride) {
	if (themeOverride === 'dark') return palette.dark;
	if (themeOverride === 'light') return palette.light;
	if (typeof window === 'undefined') return palette.light;
	// Manual override (theme toggle / ?theme= URL param) wins over the OS
	// preference — mirrors the CSS cascade (:root[data-theme] beats the
	// prefers-color-scheme media query, see +page.svelte).
	const stamped = document.documentElement.dataset.theme;
	if (stamped === 'dark') return palette.dark;
	if (stamped === 'light') return palette.light;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? palette.dark : palette.light;
}
