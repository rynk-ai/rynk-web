## **🎯 Core Features**

### **0. Authentication & Onboarding**

- **Passwordless Magic Link**: Secure email login via Resend (noreply@rynk.io).
- **Google OAuth**: One-click sign-in with Google.
- **Guest Access**: Try specific surfaces (Chat, Wiki, Quiz) without creating an account.
- **Initial Credits**: New users start with 100 credits.


### **1. Multi-Mode Chat Interface**

### **Standard Chat Mode**

- Real-time streaming responses with character-by-character rendering
- Markdown rendering with syntax highlighting for code
- Inline citations and source attribution
- Message versioning and branching
- Copy, edit, delete, and regenerate messages

### **Reasoning Modes**

| **Mode** | **Description** |
| --- | --- |
| `auto` | AI automatically decides based on query complexity |
| **on** | Force extended thinking/reasoning |
| `online` | Enable web search + reasoning |
| `off` | Direct response, no reasoning |

### **Slash Commands**

```
/web   - Enable web search for current query
/deep  - Toggle deep thinking mode
/code  - Optimize response for code output
/brief - Keep response concise

```

---

### **2. Adaptive Surfaces System**

Transform any AI response into specialized interactive formats:

### **Available Surface Types**

| **Surface** | **Icon** | **Description** |
| --- | --- | --- |
| **Chat** | 💬 | Default conversational response |
| **Course** | 📚 | Multi-chapter course with progress tracking |
| **Guide** | ✅ | Step-by-step instructions |
| **Quiz** | 🎯 | Interactive Q&A with scoring |
| **Compare** | ⚖️ | Side-by-side analysis with pros/cons |
| **Flashcard** | 🃏 | Study cards with flip animation |
| **Timeline** | 📅 | Chronological event visualization |
| **Wiki** | 📖 | Wikipedia-style structured articles |
| **Research** | 🔍 | Deep-dive reports with executive summary & citations |

### **Surface Features**

**Progressive Loading Architecture**
- **Skeleton-First**: Instant UI layout via `SurfacePageSkeleton`.
- **Parallel Generation**: Content sections stream in concurrently.
- **Hydration**: Skeletons replaced by content as it becomes ready.

**Course Surface**

- Chapter-based curriculum structure
- Progress ring with completion tracking
- Per-chapter content generation (lazy loading)
- Mark chapters complete
- Estimated reading times
- Prerequisites display

**Quiz Surface**

- Multiple choice, true/false, open-ended formats
- Keyboard shortcuts (1-4, Enter)
- Animated correct/incorrect feedback
- Score tracking and completion stats
- Retake functionality

**Flashcard Surface**

- 3D flip animation with CSS transforms
- Known/Unknown card marking
- Shuffle capability
- Progress visualization
- Spaced repetition hints

**Compare Surface**

- Multi-item comparison cards
- Pros/cons visualization
- Attribute comparison table
- AI recommendation engine
- Weighted criteria scores

**Timeline Surface**

- Vertical timeline with gradient connector
- Alternating card layout (desktop)
- Category filtering
- Importance levels (minor/moderate/major)
- Collapsible event details

**Wiki Surface**

- Infobox with key facts
- Sectioned content with subsections
- Related topics linking
- Reference citations
- Categories and metadata

**Research Surface**

- Hero image gallery
- Executive summary / Abstract
- Key findings highlight
- Deep-dive sections with inline citations
- Methodology & Limitations sections
- Interactive Table of Contents
- Source attribution badges (Academic, News, Web)

---

### **3. Sub-Chat System (Deep Dive)**

Create focused conversations on specific parts of AI responses:

- **Quote Selection**: Highlight any text in an AI response
- **Sub-Chat Creation**: Opens slide-out panel for focused discussion
- **Context Preservation**: Full message context passed to sub-chat
- **Visual Highlighting**: Quoted text highlighted in parent message
- **Multiple Sub-Chats**: Attach multiple sub-chats per message

---

### **4. Context & Memory System**

### **Conversation Context Picker**

- Reference other conversations as context
- Reference entire folders of conversations
- Visual pills showing active context
- Lazy-load context content

### **Vector Memory (Cloudflare Vectorize)**

**Per-User Memory**

- All messages embedded and stored in vector DB
- Semantic search across conversation history
- Project-scoped memory for grouped conversations

**Embedding Generation**

```
// Dual-provider strategy:
// 1. Primary: Groq (fast, cost-effective)
// 2. Fallback: OpenRouter embeddings

```

**Context Retrieval**

- Similarity search with cosine scoring
- Recency weighting for recent messages
- Cross-conversation context synthesis

---

### **5. File & Attachment Handling**

### **Supported File Types**

| **Category** | **Extensions** |
| --- | --- |
| **Images** | PNG, JPG, GIF, WebP |
| **Documents** | PDF, TXT, MD, JSON |
| **Code** | JS, TS, PY, and more |

### **Processing Pipeline**

1. **Image Files**: Convert to base64, send to multimodal LLM
2. **PDF Files**:
    - Small (<500KB): Inline text extraction
    - Large (>500KB): Async chunking + vector indexing
3. **Text Files**: Direct content injection into context
4. **Code Files**: Syntax-aware formatting

### **Knowledge Base Integration**

- Files chunked and embedded
- Linked to conversations/projects
- Searchable via vector similarity

---

### **6. Agentic Research System**

Multi-source research orchestration for complex queries:

### **Intent Analysis Pipeline**

```
User Query
    ↓
┌─────────────────────────────────────┐
│ Quick Pattern Detection (Groq)     │ ~50-100ms
│ - Category classification          │
│ - Web search necessity            │
│ - Confidence scoring              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Deep Intent Analysis (Claude Haiku)│ ~200-300ms
│ - Source selection                 │
│ - Optimized search queries        │
│ - Expected response type          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Source Orchestrator                 │
│ - Parallel fetching               │
│ - Exa + Perplexity + Wikipedia    │
│ - Result aggregation              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Response Synthesizer               │
│ - Source fusion                   │
│ - Citation injection              │
│ - Domain-aware formatting         │
└─────────────────────────────────────┘

```

### **Source Types**

| **Source** | **Use Case** |
| --- | --- |
| **Exa** | Technical articles, recent content |
| **Perplexity** | Real-time data, AI-curated answers |
| **Wikipedia** | Encyclopedic facts, established info |

---

### **7. Domain-Aware Response Formatting**

### **Supported Domains**

- Science, Medicine, Business, Law
- Arts, Journalism, Technology, Design
- Social Sciences, Environment, General

### **Automatic Detection**

- Sub-domain classification
- Information type (factual, procedural, analytical, etc.)
- Complexity level assessment
- Response requirement inference

### **Automated Disclaimers**

```
⚠️**Medical Disclaimer**: This information is for educational purposes...
⚠️**Legal Disclaimer**: This is not legal advice...
⚠️**Financial Disclaimer**: This is not financial advice...

```

---

### **8. Project Management**

### **Project Features**

- Named project spaces
- Custom instructions/system prompts
- Attached reference documents
- Project-scoped conversations
- Shared context across all project chats

### **Project Memory**

- All project messages share vector space
- Cross-conversation context retrieval
- Recent message fallback (D1) when Vectorize unavailable

---

### **9. Organization Features**

### **Folders**

- Create custom folder hierarchies
- Add/remove conversations from folders
- Folder-wide context referencing
- Color-coded folder icons

### **Tags**

- Multiple tags per conversation
- Tag-based filtering in search
- Visual tag pills on conversations

### **Pinning**

- Pin important conversations to top
- Quick access from sidebar

### **Search**

- Full-text conversation search
- Tag filtering
- Message content search
- Semantic search via embeddings

### **10. Message Features**

### **Versioning & Branching**

- Edit messages to create new versions
- Branch conversations at any point
- Switch between message versions
- Visual version indicator

### **Actions**

| **Action** | **Description** |
| --- | --- |
| Copy | Copy message content |
| Edit | Modify and regenerate |
| Delete | Remove message |
| Branch | Create conversation fork |
| Quote | Start sub-chat with selected text |
| Regenerate | Get new AI response |

### **11. Finance & Market Analysis System**

### **Core Capabilities**
- **Real-Time Market Data**: Fetches live stock quotes via Yahoo Finance (Unofficial) and crypto prices via CoinGecko.
- **Multi-Asset Support**: Seamlessly handles both Equities (Stocks/ETFs) and Cryptocurrencies.
- **Intelligent Orchestration**: `FinancialOrchestrator` manages data fetching, caching, and fallback strategies.

### **Analysis Features**
- **Technical Signals**: Automatically detects trends (Uptrend/Downtrend), market phases (Markup, Decline), and support/resistance levels.
- **Fundamental Analysis**: Provides valuation verdicts (Undervalued/Overvalued) and key metrics (P/E, Market Cap, Volume).
- **Sentiment Analysis**: Aggregates news sentiment to determine Bullish/Bearish outlooks.
- **Deep Research Integration**: Generates "Bull Case" and "Bear Case" theses based on aggregated data.
- **Risk & Catalyst Detection**: Identifies potential risks (High/Medium/Low) and upcoming catalysts (Earnings, Events).

### **UI Components (Finance Surface)**
- **Interactive Charts**: Integrated `StockChart` for visualizing price history (1D to 5Y ranges).
- **Compact Dashboard**: "Yahoo Finance" style layout with high-density information (Price, Change, High/Low).
- **Live News Feed**: Cards displaying latest relevant news headlines with source and date.
- **Signal Badges**: Visual indicators for Sentiment, Valuation, and Trend.
- **Metrics Grid**: Clean grid layout for financial ratios and indicators.

### **Data Sources**
- **Yahoo Finance**: For stocks, ETFs, and indices.
- **CoinGecko**: For cryptocurrency prices and metadata.