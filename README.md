<p align="center">
  <img src="public/icon-192.png" alt="Rynk" width="80" height="80" />
</p>

<h1 align="center">rynk</h1>

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
- **Context-Aware Responses** — Chat with your documents and data.
- **Message Versioning** — Edit, regenerate, and branch conversations.
- **File Uploads** — Support for PDF, images, and other formats.
- **Secure & Private** — Built with privacy in mind.
- **Fast & Responsive** — Powered by Cloudflare Edge.

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
