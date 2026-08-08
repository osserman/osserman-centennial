// Validated against the dataviz skill's default palette
// (node scripts/validate_palette.js from the skill's own reference instance).
//
// The main graph is a dense scatter (~1,033 simultaneously-visible nodes) —
// an "all-pairs" case where the skill only clears 3 categorical slots
// (blue/orange/aqua) for CVD + normal-vision separation. But the 4 pathway
// colors are never shown lit at the same time (each pathway step spotlights
// only its own subset, greying the rest — see narrative.js's pathway views),
// so the all-pairs constraint doesn't apply there: validated as a normal
// 4-slot adjacent-pairs categorical set instead (still all-PASS; light mode
// carries the standard sub-3:1 contrast WARN for aqua/yellow, mitigated by
// always pairing color with a text label — kicker headers, curated tags).
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
		aqua: '#1baf7a', // slot 3
		yellow: '#eda100', // slot 4
		violet: '#4a3aa7' // slot 7 — work-type only, kept apart from blue/orange
	},
	dark: {
		surface: '#1a1a19',
		textPrimary: '#ffffff',
		textSecondary: '#c3c2b7',
		muted: '#898781',
		blue: '#3987e5',
		orange: '#d95926',
		aqua: '#199e70',
		yellow: '#c98500',
		violet: '#9085e9'
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
		physical_theory: 'yellow'
	},
	// Work-type coloring shows all ~1,032 nodes simultaneously (not one
	// spotlighted subset at a time like pathway), so it's the same "all-pairs"
	// dense-scatter case as the main graph. Deliberately avoids blue/orange —
	// those already mean math/non-math one step later in the narrative, and
	// reusing them here read as a disjointed hand-off between adjacent steps.
	// aqua/yellow/violet re-validated all-pairs-safe in both modes (node
	// scripts/validate_palette.js "#1baf7a,#eda100,#4a3aa7" --pairs all).
	// Everything outside the top 3 types folds into a neutral "Other" (muted,
	// not a 4th hue) rather than stretching past the validated set.
	workType: {
		article: 'aqua',
		preprint: 'yellow',
		'book-chapter': 'violet'
	}
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
