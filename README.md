<p align="center">
  <img src="public/icon-192.png" alt="Rynk" width="80" height="80" />
</p>

<p align="center">
  <a href="https://rynk.io">
    <img src="https://img.shields.io/badge/Live-Demo-blue?style=flat&logo=cloudflare" alt="Live Demo" />
  </a>
  <a href="https://github.com/rynk-ai/rynk-web/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
  </a>
  <a href="https://workers.cloudflare.com">
    <img src="https://img.shields.io/badge/Built%20with-Cloudflare-orange?logo=cloudflare&logoColor=white" alt="Built with Cloudflare" />
  </a>
</p>


**Supported by**
<br />
<a href="https://exa.ai">
  <img src="https://github.com/exa-ai.png" height="60" alt="Exa AI" />
</a>
&nbsp;&nbsp;
<a href="https://www.cloudflare.com/startups/">
  <img src="https://github.com/cloudflare.png" height="60" alt="Cloudflare for Startups" />
</a>
<br />


---

## Overview

Rynk is an AI interface designed for research, verification, and structured learning. It aggregates data from multiple sources and presents it through specialized interactive surfaces.

**Built entirely on the Cloudflare Developer Platform.**

### Core Features

- **Agentic Research**: Orchestrates parallel searches across Exa, Perplexity, and Wikipedia to synthesize comprehensive answers with citations.
- **Finance & Analysis**: Real-time market data, technical signals, and interactive charts for stocks and crypto.
- **Learning Engine**: Generates structured courses, quizzes, and flashcards on any topic with progress tracking.
- **Chat Interface**: Supports message branching, versioning, and "deep dive" sub-chats for focused discussions.
- **Knowledge Engine**: Vector-based semantic search across conversation history and uploaded files (PDFs, Images, Code).

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

| Technology | Purpose |
|------------|---------|
| **Next.js 15 (OpenNext)** | React Framework |
| **Cloudflare Pages** | Edge Execution & Hosting |
| **Cloudflare D1** | SQLite Database (Relational Data) |
| **Cloudflare R2** | Object Storage (Files & Assets) |
| **Cloudflare Vectorize** | Vector Database (Embeddings) |
| **Cloudflare Workers AI** | AI Inference at the Edge |
| **Durable Objects** | Task Processing & Coordination |
| **TailwindCSS 4** | Styling System |
| **TypeScript** | Type Safety |



## License

MIT License — see [LICENSE](LICENSE) for details.
