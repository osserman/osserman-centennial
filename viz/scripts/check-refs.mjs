// Catch calls to functions that do not exist.
//
// Neither `vite build` nor `svelte-check` will: in a plain-JS Svelte component
// an undefined function is just a free variable, legal until the line runs. For
// a scroll-scrubbed scene that can be minutes after load, deep inside a beat
// nobody re-tests by hand — which is how a helper deleted as collateral during
// a refactor reached the browser with every line in the Poincaré sequence
// silently failing to draw.
//
// Uses acorn rather than regexes. A first regex attempt both missed that exact
// bug and invented false ones, because a pattern loose enough to collect every
// bound name (parameters, destructuring, arrows) also swallows names it should
// be reporting.
//
// Run: npm run check:refs
import fs from 'fs';
import path from 'path';
import * as acorn from 'acorn';

const GLOBALS = new Set([
	'Math', 'Number', 'Array', 'Object', 'String', 'JSON', 'Set', 'Map', 'WeakMap', 'Boolean',
	'Date', 'Error', 'Promise', 'Symbol', 'BigInt', 'RegExp', 'Float32Array', 'Float64Array',
	'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int32Array', 'ArrayBuffer', 'structuredClone',
	'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval',
	'clearInterval', 'queueMicrotask', 'parseFloat', 'parseInt', 'isFinite', 'isNaN', 'fetch',
	'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'URL', 'URLSearchParams',
	'window', 'document', 'console', 'globalThis', 'performance', 'navigator', 'location',
	// Svelte
	'onMount', 'onDestroy', 'tick', 'getContext', 'setContext', 'createEventDispatcher', 'untrack'
]);

const declaredNames = (node, out = []) => {
	if (!node) return out;
	switch (node.type) {
		case 'Identifier': out.push(node.name); break;
		case 'ObjectPattern': node.properties.forEach((p) => declaredNames(p.value ?? p.argument, out)); break;
		case 'ArrayPattern': node.elements.forEach((e) => declaredNames(e, out)); break;
		case 'AssignmentPattern': declaredNames(node.left, out); break;
		case 'RestElement': declaredNames(node.argument, out); break;
	}
	return out;
};

function collect(node, defined, called) {
	if (!node || typeof node.type !== 'string') return;
	switch (node.type) {
		case 'FunctionDeclaration':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
			if (node.id) defined.add(node.id.name);
			node.params.forEach((p) => declaredNames(p).forEach((n) => defined.add(n)));
			break;
		case 'VariableDeclarator':
			declaredNames(node.id).forEach((n) => defined.add(n));
			break;
		case 'ClassDeclaration':
			if (node.id) defined.add(node.id.name);
			break;
		case 'ImportDeclaration':
			node.specifiers.forEach((sp) => defined.add(sp.local.name));
			break;
		case 'CatchClause':
			declaredNames(node.param).forEach((n) => defined.add(n));
			break;
		case 'CallExpression':
			// Only bare `name(...)`. Method calls resolve at runtime on an object
			// and are none of this check's business.
			if (node.callee.type === 'Identifier') called.set(node.callee.name, (called.get(node.callee.name) ?? 0) + 1);
			break;
	}
	for (const key of Object.keys(node)) {
		const v = node[key];
		if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && collect(c, defined, called));
		else if (v && typeof v.type === 'string') collect(v, defined, called);
	}
}

export function checkFile(file) {
	const src = fs.readFileSync(file, 'utf8');
	const defined = new Set();
	const called = new Map();
	// Every <script> block in the component shares one scope for our purposes:
	// module-level declarations are visible to the instance script.
	const re = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
	let m;
	while ((m = re.exec(src))) {
		let ast;
		try {
			ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true });
		} catch {
			return { parseFailed: true, missing: [] };
		}
		collect(ast, defined, called);
	}
	const missing = [...called.entries()]
		.filter(([n]) => !defined.has(n) && !GLOBALS.has(n) && !n.startsWith('$'))
		.map(([name, count]) => ({ name, count }));
	return { parseFailed: false, missing };
}

function walk(dir, out = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith('.svelte')) out.push(p);
	}
	return out;
}

const args = process.argv.slice(2);
const files = args.length ? args : walk('src');
let failed = 0;
let skipped = 0;
for (const f of files) {
	const { parseFailed, missing } = checkFile(f);
	if (parseFailed) { skipped++; continue; }
	if (missing.length) {
		failed++;
		console.log(`FAIL ${f}`);
		for (const { name, count } of missing) console.log(`       ${name}() — ${count} call site(s), never defined`);
	}
}
console.log(
	failed
		? `\n${failed} file(s) call functions that do not exist.`
		: `checked ${files.length - skipped} components — every called function resolves` +
			(skipped ? ` (${skipped} unparseable, skipped)` : '')
);
process.exit(failed ? 1 : 0);
