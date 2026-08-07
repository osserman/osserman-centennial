export const prerender = true;

export async function load({ fetch }) {
	const [nodesFile, curated] = await Promise.all([
		fetch('/data/nodes.json').then((r) => r.json()), // { seedId, timeDomain, nodes }
		fetch('/data/curated_papers.json').then((r) => r.json())
	]);
	return { nodes: nodesFile.nodes, seedId: nodesFile.seedId, timeDomain: nodesFile.timeDomain, curated };
}
