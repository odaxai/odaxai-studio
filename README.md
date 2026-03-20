<div align="center">
  <img src="services/odax-chat/public/odaxai-logo.png" alt="OdaxAI Studio" height="120" />
  <h1>OdaxAI Studio</h1>
  <p><strong>Local-first AI workspace for macOS</strong></p>
  <p>
    Chat with LLMs, code in an integrated IDE, analyze documents —<br/>
    everything runs on your machine. No cloud. No API keys. No data leaves your device.
  </p>
</div>

<p align="center">
  <a href="#demo">Demo</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#build-from-source">Build from Source</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#license">License</a>
</p>

---

## Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=TTXvvQSuD1E">
    <img src="https://img.youtube.com/vi/TTXvvQSuD1E/maxresdefault.jpg" alt="OdaxAI Studio Demo" width="700" />
  </a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=TTXvvQSuD1E"><strong>Watch the full demo on YouTube →</strong></a>
</p>

---

## Features

### AI Chat
- **Local LLM inference** via llama.cpp with Metal GPU acceleration on Apple Silicon
- **PDF analysis** — drag-and-drop documents for structured AI extraction
- **Reasoning panel** — see the model's chain-of-thought in real time
- **Vector memory** — conversations and facts persisted locally with LanceDB
- **Code execution** — run Python snippets directly from chat
- **Document translation** — full-document translation with background processing

### Integrated IDE
- Full **VS Code** experience in-browser via code-server
- **AI autocomplete** powered by llama.vscode — runs entirely on-device
- Pre-configured dark theme, extensions, and clean menus

### Native macOS App
- Swift/SwiftUI wrapper with tabbed WebView interface
- Automatic service lifecycle management (start, stop, health checks)
- One-click launch — all services start automatically

---

## Quick Start

### Download (macOS)

Download the latest `.dmg` from the **[Releases](https://github.com/odaxai/odaxai-studio/releases)** page.

1. Open the `.dmg` and drag **OdaxStudio** into your Applications folder
2. Launch OdaxStudio — all services start automatically on first run
3. macOS may ask you to allow the app in **System Preferences → Privacy & Security** (the app is self-signed)

> **First launch** takes a few minutes while services initialize. Subsequent launches are fast.

### System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| **OS** | macOS 13.0 (Ventura) | macOS 14.0+ (Sonoma) |
| **RAM** | 8 GB | 16 GB+ |
| **Disk** | 10 GB free | 20 GB+ |
| **Chip** | Intel (x86_64) | Apple Silicon (M1/M2/M3/M4) |

> Apple Silicon is strongly recommended for Metal GPU acceleration with llama.cpp.

---

## Build from Source

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| macOS | 13.0+ | Required |
| Node.js | 18+ | `node --version` |
| npm | 9+ | Comes with Node.js |
| Xcode | 15+ | For native macOS app build |
| CMake | 3.20+ | `brew install cmake` |
| GGUF Model | — | Download from [Hugging Face](https://huggingface.co/models?search=gguf) |

### 1. Clone & Install

```bash
git clone https://github.com/odaxai/odaxai-studio.git
cd odaxai-studio
./setup.sh
```

### 2. Download a Model

```bash
mkdir -p ~/.odax/models

# Example: download Qwen 2.5 3B (fits in 8 GB RAM)
# Visit https://huggingface.co/models?search=gguf and download a .gguf file
# Place it in ~/.odax/models/
```

### 3. Build llama.cpp

The llama.cpp server binary is not included in the source repo — build it from source:

```bash
cd server/llama.cpp
cmake -B build -DGGML_METAL=ON
cmake --build build --config Release -j$(sysctl -n hw.ncpu)

# Copy binaries to the macOS app resources directory
mkdir -p ../../apps/macos/resources/llama-server
cp build/bin/llama-server ../../apps/macos/resources/llama-server/
cp build/lib/*.dylib ../../apps/macos/resources/llama-server/
cp ggml/src/ggml-metal/ggml-metal.metal ../../apps/macos/resources/llama-server/
cd ../..
```

### 4. Launch

```bash
./run-odax.sh
```

### 5. Build macOS App (optional)

```bash
cd apps/macos/scripts
./build.sh
# Outputs: OdaxStudio.app and OdaxStudio.dmg
```

### Environment Variables (optional)

Firebase integration is optional — only needed if you want cloud authentication/sync.

```bash
cp services/odax-chat/.env.example services/odax-chat/.env.local
# Edit .env.local with your Firebase credentials
```

The app works fully offline without any environment variables configured.

---

## Architecture

```
odaxai-studio/
├── apps/
│   ├── macos/             # Native macOS app (Swift/SwiftUI)
│   │   ├── project/       # Xcode project
│   │   ├── scripts/       # Build & run scripts
│   │   └── resources/     # Runtime resources (binaries built separately)
│   ├── web/               # Dashboard UI (Next.js)
│   └── ide/               # VS Code configuration & extensions
│
├── server/
│   └── llama.cpp/         # LLM inference engine (Metal-optimized fork)
│
├── services/
│   ├── odax-chat/         # AI chat interface (Next.js + React)
│   └── code-server/       # VS Code in browser
│
├── packages/              # Shared packages
├── setup.sh               # Dependency installer
└── run-odax.sh            # One-command launcher
```

### Services & Ports

| Port | Service | Description |
|------|---------|-------------|
| `3000` | Dashboard | Management UI and service overview |
| `3002` | OdaxAI Chat | AI chat, PDF analysis, document translation |
| `8080` | code-server | VS Code IDE in the browser |
| `8081` | llama.cpp | LLM inference API (OpenAI-compatible) |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Native App | Swift 5.9, SwiftUI, WKWebView |
| AI Chat | Next.js 15, React 19, TypeScript |
| IDE | code-server (VS Code in browser) + llama.vscode |
| LLM Backend | llama.cpp — C/C++ with Metal GPU acceleration |
| Vector Database | LanceDB (embedded, local-only) |
| Build System | npm workspaces |

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test them
4. Commit with a descriptive message: `git commit -m "feat: add my feature"`
5. Push and open a Pull Request

### Running Services Individually

For faster iteration during development, run services separately:

```bash
# Terminal 1 — Dashboard
cd apps/web && npm run dev

# Terminal 2 — AI Chat
cd services/odax-chat && PORT=3002 npm run dev

# Terminal 3 — LLM Server
cd server/llama.cpp
./build/bin/llama-server -m ~/.odax/models/your-model.gguf --port 8081 --n-gpu-layers 99
```

The macOS app manages all services via `ProcessManager.swift`. During development, you can run services independently and changes will be reflected on browser reload.

---

## License

This project is licensed under the **[PolyForm Noncommercial License 1.0.0](./LICENSE)**.

You may use, copy, modify, and distribute this software for **noncommercial purposes only**.

For commercial licensing inquiries, please open an issue or contact the maintainers.

---

## Acknowledgments

OdaxAI Studio builds on these open-source projects:

- [llama.cpp](https://github.com/ggerganov/llama.cpp) — High-performance LLM inference
- [code-server](https://github.com/coder/code-server) — VS Code in the browser
- [LanceDB](https://github.com/lancedb/lancedb) — Embedded vector database
