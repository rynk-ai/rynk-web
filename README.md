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

### 🧠 **Multi-Mode Intelligence**
- **Reasoning Modes** — Toggle between `Auto`, `On` (Deep Thinking), and `Off` strategies.
- **Slash Commands** — Use `/web`, `/deep`, `/code`, and `/brief` to control the AI.
- **Agentic Research** — Deep multi-source research orchestration using Exa, Perplexity, and Wikipedia.

### 🃏 **Adaptive Surfaces**
Transform AI responses into specialized interactive formats:
- **Learning** — Full courses 📚, Quizzes 🎯, and Flashcards 🃏 for active study.
- **Analysis** — Comparison tables ⚖️, Timelines 📅, and Wikis 📖.
- **Finance** — Real-time stock/crypto data 💹 and deep market analysis.
- **Research** — Deep-dive reports 🔍 with citations and methodology.

### 📚 **Knowledge & Context**
- **Vector Memory** — Semantic search across your entire conversation history.
- **File Processing** — Handle PDFs (with chunking), Images, and Code with syntax awareness.
- **Project Spaces** — Organize chats into Projects and Folders with shared context.

### 💬 **Advanced Chat**
- **Sub-Chat Deep Dives** — Highlight any text to start a focused side-conversation.
- **Branching** — Fork conversations at any point to explore new paths.
- **Message Versioning** — Edit and regenerate messages while keeping history.

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
