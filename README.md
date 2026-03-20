<div align="center">
  <img src="services/odax-chat/public/odaxai-logo.png" alt="OdaxAI Studio" height="120" />
  <h1>OdaxAI Studio</h1>
  <p><strong>Local-first AI workspace for macOS</strong></p>
  <p>Chat with LLMs, code in an integrated IDE, analyze documents — everything runs on your machine.</p>
  <p>No cloud dependency. No API keys required. Your data never leaves your device.</p>
</div>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#build-from-source">Build from Source</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#license">License</a>
</p>

---

## Features

### AI Chat
- Local LLM inference via **llama.cpp** with Metal GPU acceleration
- Drag-and-drop **PDF analysis** with structured extraction
- **Reasoning panel** — see the model's chain-of-thought in real time
- **Vector memory** — conversations and facts persisted locally with LanceDB
- **Code execution** — run Python snippets directly from chat
- **Document translation** — background processing for full documents

### Integrated IDE
- Full **VS Code** experience in-browser via code-server
- **AI autocomplete** powered by llama.vscode (local, no cloud)
- Pre-configured dark theme, extensions, and clean menus

### Native macOS App
- Swift/SwiftUI wrapper with tabbed WebView interface
- Automatic service lifecycle management (start/stop/health checks)
- System tray integration and native feel

---

## Quick Start

### Download (macOS)

Download the latest `.dmg` from the **[Releases](https://github.com/odaxai/odaxai-studio/releases)** page:

1. Open the `.dmg` and drag **OdaxStudio** into Applications
2. Launch OdaxStudio — all services start automatically
3. On first launch, macOS may ask for permission in **System Preferences → Privacy & Security**

### System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| **OS** | macOS 13.0 (Ventura) | macOS 14+ |
| **RAM** | 8 GB | 16 GB+ |
| **Disk** | 10 GB free | 20 GB+ |
| **Chip** | Intel (x86_64) | Apple Silicon (M1/M2/M3/M4) |

---

## Build from Source

### Prerequisites

- **macOS 13.0+**
- **Node.js 18+** and **npm**
- **Xcode 15+** (for native macOS app build)
- A **GGUF model** file (download from [Hugging Face](https://huggingface.co/models?search=gguf))

### Setup

```bash
# Clone the repository
git clone https://github.com/odaxai/odaxai-studio.git
cd odaxai-studio

# Install all dependencies
./setup.sh

# Download a model (example: Qwen 2.5 3B)
mkdir -p ~/.odax/models
# Place your .gguf model file in ~/.odax/models/

# Launch all services
./run-odax.sh
```

### Build llama.cpp Server

The pre-built binaries are not included in the source repo. Build them from source:

```bash
cd server/llama.cpp
cmake -B build -DGGML_METAL=ON
cmake --build build --config Release -j$(sysctl -n hw.ncpu)

# Copy to the macOS app resources
cp build/bin/llama-server ../../../apps/macos/resources/llama-server/
cp build/lib/*.dylib ../../../apps/macos/resources/llama-server/
cp ggml/src/ggml-metal/ggml-metal.metal ../../../apps/macos/resources/llama-server/
```

### Build the macOS App (optional)

```bash
cd apps/macos/scripts
./build.sh
# Outputs: OdaxStudio.app and OdaxStudio.dmg
```

### Environment Variables (optional)

Firebase integration is optional and only needed for cloud sync features. Copy the example file and configure if desired:

```bash
cp services/odax-chat/.env.example services/odax-chat/.env.local
```

---

## Architecture

```
OdaxEngine/
├── apps/
│   ├── macos/             # Native macOS app (Swift/SwiftUI)
│   │   ├── project/       # Xcode project files
│   │   ├── scripts/       # Build & run scripts
│   │   └── resources/     # Bundled binaries & extensions
│   ├── web/               # Dashboard (Next.js)
│   └── ide/               # VS Code config & extensions
│
├── server/
│   └── llama.cpp/         # LLM inference engine (Metal-optimized)
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
| `3000` | Dashboard | Management UI |
| `3002` | OdaxAI Chat | AI chat + PDF analysis + translation |
| `8080` | code-server | VS Code IDE |
| `8081` | llama.cpp | LLM inference API (OpenAI-compatible) |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Native App | Swift 5.9, SwiftUI, WKWebView |
| AI Chat | Next.js 15, React 19, TypeScript |
| IDE | code-server (VS Code fork) + llama.vscode |
| LLM Backend | llama.cpp (C/C++, Metal GPU acceleration) |
| Vector DB | LanceDB (local, embedded) |
| Build System | npm workspaces |

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test them
4. Commit with a descriptive message: `git commit -m "feat: add my feature"`
5. Push and open a Pull Request

### Development Tips

- Run services individually for faster iteration:
  ```bash
  # Dashboard
  cd apps/web && npm run dev

  # AI Chat
  cd services/odax-chat && PORT=3002 npm run dev

  # llama.cpp server
  cd server/llama.cpp && ./build/bin/llama-server -m ~/.odax/models/your-model.gguf --port 8081
  ```

- The macOS app embeds all services via `ProcessManager.swift` — changes to web services are reflected on reload

---

## License

This project is licensed under the **[PolyForm Noncommercial License 1.0.0](./LICENSE)**.

You may use, copy, modify, and distribute this software for **noncommercial purposes only**.

For commercial licensing inquiries, contact the maintainers.

---

## Acknowledgments

OdaxAI Studio builds on these open-source projects:

- [llama.cpp](https://github.com/ggerganov/llama.cpp) — High-performance LLM inference
- [code-server](https://github.com/coder/code-server) — VS Code in the browser
- [LanceDB](https://github.com/lancedb/lancedb) — Embedded vector database

---

<p align="center">
  <em>Built for local-first AI workflows</em>
</p>
