# OdaxAI Web App

Next.js 14 web application providing the unified OdaxAI Studio interface.

## Features

### Chat Module
- ✅ ChatGPT-like thread management
- ✅ Create, rename, delete conversations
- ✅ Search conversations
- ✅ Message streaming UI
- ✅ Code block syntax highlighting
- ✅ Copy code functionality
- ✅ Local persistence with IndexedDB

### IDE Module
- ✅ code-server integration via iframe
- ✅ Error handling for offline IDE
- 🚧 Custom Monaco integration (future)
- 🚧 File system bridging (future)

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                  # Next.js app router
│   ├── chat/            # Chat page
│   ├── ide/             # IDE page
│   └── api/             # API routes
├── components/          # React components
│   ├── chat/           # Chat UI components
│   ├── ide/            # IDE UI components
│   └── layout/         # Layout components
├── store/              # Zustand stores
└── lib/                # Utilities
```

## State Management

Uses Zustand with persistence middleware:
- `chat-store.ts` - Conversation and message management
- Local storage automatic sync
- Optimistic UI updates

## Styling

- **TailwindCSS** for utility-first styling
- **Custom design tokens** matching Cursor/ChatGPT aesthetics
- **Dark mode** by default
- **Responsive** layout

## API Routes

### POST /api/chat
Send a message and receive AI response.

**Request:**
```json
{
  "conversationId": "string",
  "message": "string"
}
```

**Response:**
```json
{
  "content": "string"
}
```

Currently returns placeholder response. Will connect to Odax Engine in MLP-3.

## Environment Variables

See `.env.example` for configuration options.

## Development

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

## Integration with IDE

The web app proxies `/ide/*` routes to code-server running on port 8080.

See `next.config.js` for proxy configuration.

