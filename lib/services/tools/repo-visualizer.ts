
import { Node, Edge } from 'reactflow';
import dagre from 'dagre';

const GITHUB_API_BASE = 'https://api.github.com';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

export type RepoNode = Node;
export type RepoEdge = Edge;

export interface RepoAnalysisResult {
  nodes: RepoNode[];
  edges: RepoEdge[];
  summary: string;
  techStack: string[];
}

// 1. Fetch Repo Details & Tree
async function fetchGitHubData(owner: string, repo: string) {
  // Get Repo Info (Default Branch)
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: { 'User-Agent': 'Rynk-Visualizer' }
  });
  if (!repoRes.ok) throw new Error('Repo not found or private');
  const repoData = await repoRes.json() as any;
  const branch = repoData.default_branch;

  // Get Tree
  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { 'User-Agent': 'Rynk-Visualizer' }
  });
  if (!treeRes.ok) throw new Error('Failed to fetch file tree');
  const treeData = await treeRes.json() as any;
  
  // Truncate if too huge to prevent chaos
  const files = treeData.tree.slice(0, 200).map((f: any) => f.path);
  
  return { files, description: repoData.description };
}

// 2. AI Analysis (Stack & Summary)
async function analyzeRepoContext(files: string[], description: string): Promise<{ summary: string, stack: string[] }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { summary: "Groq API Key missing", stack: [] };

    const prompt = `
    Analyze this GitHub repository based on its file structure and description.
    Description: ${description}
    Files (first 200):
    ${files.join('\n')}

    1. Identify the Tech Stack (languages, frameworks).
    2. Write a 1-sentence "Architecture Summary" (e.g. "A Next.js app using Tailwind and Supabase").

    Return structured JSON: { "stack": ["..."], "summary": "..." }
    `;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2,
            }),
        });
        
        const data: any = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        return { summary: content.summary, stack: content.stack };
    } catch (e) {
        console.error("AI Analysis failed", e);
        return { summary: "Analysis failed", stack: [] };
    }
}

// 3. Generate Graph (Simple Folder -> File Hierarchy)
function generateGraph(files: string[]) {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const createdPaths = new Set<string>();

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR' });
    g.setDefaultEdgeLabel(() => ({}));

    // Root Node
    nodes.push({ id: 'root', position: { x: 0, y: 0 }, data: { label: 'Root' }, type: 'input' });
    g.setNode('root', { width: 100, height: 40 });

    files.forEach((path, idx) => {
        const parts = path.split('/');
        let currentPath = '';

        parts.forEach((part, partIdx) => {
            const parentPath = currentPath === '' ? 'root' : currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!createdPaths.has(currentPath)) {
                // Determine Type (Folder vs File approximation)
                const isFile = partIdx === parts.length - 1 && parts[partIdx].includes('.');
                const type = isFile ? 'default' : 'default'; // Can customize node types later

                nodes.push({
                    id: currentPath,
                    // Initial position (Dagre will fix)
                    position: { x: 0, y: 0 },
                    data: { label: part },
                    type: isFile ? 'output' : 'default', // Leaf nodes as output
                    style: isFile ? { background: '#fff', border: '1px solid #777', width: 150 } : { background: '#eee', border: '1px solid #333', width: 150 },
                });
                
                g.setNode(currentPath, { width: 150, height: 40 });
                createdPaths.add(currentPath);

                // Edge from Parent
                edges.push({
                    id: `${parentPath}-${currentPath}`,
                    source: parentPath,
                    target: currentPath,
                    type: 'smoothstep',
                    animated: !isFile
                });
                g.setEdge(parentPath, currentPath);
            }
        });
    });

    // Compute Layout
    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - (node.style?.width as number || 150) / 2,
                y: nodeWithPosition.y - 20,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

// Main Function
export async function visualizeRepo(url: string): Promise<RepoAnalysisResult> {
    // Parse URL (e.g. github.com/owner/repo)
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    const [_, owner, repo] = match;

    const { files, description } = await fetchGitHubData(owner, repo);
    const { summary, stack } = await analyzeRepoContext(files, description || "");
    const { nodes, edges } = generateGraph(files.slice(0, 50)); // Limit graph complexity for now

    return { nodes, edges, summary, techStack: stack };
}
