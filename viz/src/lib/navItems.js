// The piece's main-sequence stops -- shared between StanzaNav (the subtle
// Intro/I/II/III/Coda row at the end of every stanza) and GlobalNav (the
// persistent corner menu, reachable mid-scroll from anywhere). One list, so
// adding a stanza or the eventual Coda page only means editing here.
//
// `path` is relative to `base` ($app/paths) -- each consumer builds its own
// href as `${base}${path}`. `null` means "not a page yet," rendered as a
// non-clickable placeholder rather than a link.
export const NAV_ITEMS = [
	{ key: 'intro', label: 'Intro', path: '/' },
	{ key: 'I', label: 'Stanza I', path: '/non-euclidean-geometry' },
	{ key: 'II', label: 'Stanza II', path: '/minimal-surfaces' },
	{ key: 'III', label: 'Stanza III', path: '/beyond-mathematics' },
	{ key: 'coda', label: 'Coda', path: '/coda' }
];
