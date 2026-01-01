<div align="center">
  <img src="services/odax-chat/public/odaxai-logo.png" alt="OdaxAI Logo" height="100" style="vertical-align: middle;" />
  <h1 style="display: inline-block; vertical-align: middle; margin-left: 15px;">OdaxAI Studio</h1>
</div>

<p align="center">
  <strong>Your private AI workspace — runs entirely on your Mac</strong>
</p>

<p align="center">
  Chat with AI, code in an integrated IDE, analyze documents — all locally.<br/>
  No cloud. No API keys. No data leaves your machine.
</p>

<p align="center">
  <a href="#demo">Demo</a> •
  <a href="#download">Download</a> •
  <a href="#features">Features</a> •
  <a href="#build-from-source">Build from Source</a> •
  <a href="#license">License</a>
</p>

---

## Demo

[![OdaxAI Studio Demo](https://img.youtube.com/vi/TTXvvQSuD1E/maxresdefault.jpg)](https://www.youtube.com/watch?v=TTXvvQSuD1E)

> **[Watch the full demo on YouTube ->](https://www.youtube.com/watch?v=TTXvvQSuD1E)**

---

## Download

### macOS (Apple Silicon & Intel)

Download the latest `.dmg` from the **[Releases](https://github.com/odaxai/odaxai-studio/releases)** page:

1. Download `OdaxStudio-1.0.0.dmg`
2. Open the `.dmg` and drag **OdaxStudio** to your Applications folder
3. Launch OdaxStudio
4. The app will automatically set up all services on first run

> **Note:** On first launch, macOS may ask you to allow the app in **System Preferences -> Privacy & Security**.

### Requirements

| Requirement | Minimum |
|------------|---------|
| **OS** | macOS 13.0 (Ventura) |
| **RAM** | 8 GB (16 GB+ recommended) |
| **Disk** | 10 GB free |
| **Chip** | Apple Silicon recommended (Intel supported) |

---

## Features

### AI Chat
- Chat with local LLMs powered by **llama.cpp** (Metal GPU acceleration)
- PDF analysis - drag & drop documents for instant AI analysis
- Reasoning panel - see the model's thinking process
- Local memory - conversations persisted with LanceDB
- Code execution - run Python directly from chat
- Document translation - translate documents in background

### Integrated IDE
- Full **VS Code** in browser via code-server
- AI autocomplete powered by llama.vscode
- Custom dark theme, clean menus
- All extensions pre-configured

---

## Build from Source

### Prerequisites

- **macOS 13.0+**
- **Node.js 18+** and **pnpm 8+**
- **Xcode 15+** (for native app build)

### Steps

```bash
# 1. Clone
git clone https://github.com/odaxai/odaxai-studio.git
cd odaxai-studio

# 2. Install dependencies
pnpm install

# 3. Run setup (installs all service dependencies)
./setup.sh

# 4. Download a model
mkdir -p ~/.odax/models
# Download any GGUF model from https://huggingface.co/
# Example: Qwen 2.5 3B, Llama 3, etc.

# 5. Launch
./run-odax.sh

# 6. Build macOS App & Create DMG (Optional)
# This will generate OdaxStudio.xcodeproj, build the app, and output OdaxStudio.dmg
# You can rename the dmg to OdaxStudio-1.0.0.dmg for releases.
cd apps/macos/scripts
./build.sh
```

### Project Structure

```
odaxai-studio/
├── apps/
│   ├── macos/          # Native macOS App (Swift/SwiftUI)
│   ├── web/            # Dashboard (Next.js)
│   └── ide/            # VS Code config & extensions
│
├── server/
│   └── llama.cpp/      # LLM inference (Metal-optimized)
│
├── services/
│   ├── odax-chat/      # AI chat interface
│   └── code-server/    # VS Code IDE
│
├── run-odax.sh         # One-command launcher
└── setup.sh            # Full setup script
```

### Services & Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Dashboard | Management interface |
| 3002 | OdaxChat | AI chat + PDF analysis |
| 8080 | code-server | VS Code IDE |
| 8081 | llama.cpp | LLM inference API |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **macOS App** | Swift 5.9, SwiftUI, WKWebView |
| **Chat** | Next.js, React, TypeScript |
| **IDE** | code-server + llama.vscode |
| **AI Backend** | llama.cpp (C/C++, Metal GPU) |
| **Build** | Turborepo, pnpm workspaces |

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## License

This project is licensed under the PolyForm Noncommercial 1.0.0 license.

You may use, copy, modify, and distribute this software for noncommercial purposes only.

For any commercial use, production deployment, SaaS offering, internal business use, OEM embedding, or revenue-generating use, a separate commercial license from OdaxAI SRL is required.

Commercial licensing: hello@odaxai.com 
*This is not an open-source license. Commercial use is not permitted under the public license.*

---

## Acknowledgments

OdaxAI Studio integrates several open-source projects:
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — LLM inference engine
- [code-server](https://github.com/coder/code-server) — VS Code in browser

---

<p align="center">
  <strong>OdaxAI SRL Copyright 2026</strong><br/>
  <em>Built for local AI workflows</em>
</p>
