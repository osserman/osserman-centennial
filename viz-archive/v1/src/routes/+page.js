export const prerender = true;

export async function load({ fetch }) {
	const [nodesFile, edges, curated] = await Promise.all([
		fetch('/data/nodes.json').then((r) => r.json()), // { seedId, fields, nodes }
		fetch('/data/edges.json').then((r) => r.json()),
		fetch('/data/curated_papers.json').then((r) => r.json())
	]);
	return { nodes: nodesFile.nodes, seedId: nodesFile.seedId, fields: nodesFile.fields, edges, curated };
}
