<p align="center">
  <img src="public/icon-192.png" alt="Rynk" width="80" height="80" />
</p>

<p align="center">
  <strong>AI chat application with file uploads, message versioning, and context-aware responses.</strong>
</p>

<p align="center">
  <a href="https://rynk.io">
    <img src="https://img.shields.io/badge/Live-Demo-blue?style=flat&logo=cloudflare" alt="Live Demo" />
  </a>
  <a href="https://github.com/rynk-ai/rynk-web/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
  </a>
</p>

---

## What is Rynk?

Rynk is a powerful AI chat interface built for your data. It seamlessly combines advanced conversational AI with your personal files, allowing for deep, context-aware interactions.

**Key features:**

### Multi-Mode Intelligence
- **Reasoning Modes** — Toggle between `Auto`, `On` (Deep Thinking), `Online` (Web + Reasoning), and `Off`.
- **Agentic Research** — autonomous multi-step research pipeline connecting Exa, Perplexity, and Wikipedia.

### Adaptive Surfaces
Transform any AI response into specialized interactive formats:
- **Learning** — Full courses, Interactive Quizzes, and Flashcards.
- **Analysis** — Comparison Tables, Timelines, and Wikis.
- **Finance** — Real-time market data with technical analysis and charts (Stocks/Crypto).
- **Research** — Comprehensive reports with citations, methodology, and executive summaries.

### Advanced Chat & Collaboration
- **Sub-Chat Deep Dives** — Select *any* text to branch into a focused sub-conversation.
- **Versioning & Branching** — Edit, fork, and traverse message history trees.
- **Project Workspaces** — Organize chats into named projects with shared context and instructions.
- **Organization** — Folders, Tags, Pinning, and Full-text/Semantic Search.

### Knowledge Engine
- **Vector Memory** — Semantic retrieval across your entire conversation history.
- **Smart File Processing** —
  - **PDFs**: Intelligent chunking and indexing.
  - **Images**: Multimodal analysis.
  - **Code**: Syntax-aware context injection.

---

## Development

### Prerequisites

- Node.js 18+
- pnpm / npm / yarn
- Wrangler CLI (for Cloudflare)

### Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy to Cloudflare Pages
npm run deploy
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js | React Framework |
| Cloudflare Pages | Hosting & Edge Execution |
| D1 (SQLite) | Database |
| R2 | Object Storage |
| TailwindCSS | Styling |
| TypeScript | Type Safety |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
