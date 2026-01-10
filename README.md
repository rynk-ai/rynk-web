# Rynk

AI interface designed for research, verification, and structured learning aggregating data from multiple sources and presenting it through specialized interactive surfaces.

![Rynk](/public/og-image.png)

<br />

🔗 **[Try Rynk at rynk.io](https://rynk.io)**

## Powered By

<div align="center">

|          [Cloudflare for Startups](https://workers.cloudflare.com/)          |                [Exa AI](https://exa.ai)                |
| :--------------------------------------------------------------------------: | :----------------------------------------------------: |
| <img src="https://avatars.githubusercontent.com/u/314135?s=200&v=4" alt="Cloudflare" height="40" /> | <img src="/public/exa.png" alt="Exa AI" height="40" /> |
|            Supported by Cloudflare for Startups program             |          Supported by Exa AI Labs           |

</div>

## Features

### Research & Verification

- **Agentic Research**: Orchestrates parallel searches across Exa, Perplexity, and Wikipedia to synthesize comprehensive answers with citations.
- **Deep Dive**: Deep research capabilities with multiple source verification and analysis.
- **Knowledge Engine**: Vector-based semantic search across conversation history.

### Finance & Analysis

- **Real-time Data**: Access live market data and technical signals.
- **Interactive Charts**: Dynamic visualizations for stocks and cryptocurrencies.
- **Code Execution**: Run Python code for complex data analysis and chart generation.

### Education & Learning

- **Learning Engine**: Generates structured courses, quizzes, and flashcards on any topic with progress tracking.
- **Structured Learning**: Adaptive learning paths personalized to your knowledge level.

### Core Core Experience

- **Context-aware Chat**: Supports message branching, versioning, and thread management.
- **File Uploads**: Drag and drop support for PDFs, images, and code files with semantic search integration.
- **Message Versioning**: Branch conversations to explore different potential outcomes.

## Built with

- [Next.js](https://nextjs.org/) - React framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge runtime
- [OpenNext](https://opennext.js.org/) - Next.js on Cloudflare
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Shadcn/UI](https://ui.shadcn.com/) - UI components
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite Database
- [Cloudflare R2](https://developers.cloudflare.com/r2/) - Object Storage
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) - Vector Database
- [Workers AI](https://developers.cloudflare.com/workers-ai/) - Edge Inference

### Local development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rynk-ai/rynk-web.git
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

4. **Deploy**:
   ```bash
   pnpm run deploy
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
