# OdaxAI IDE

code-server integration providing Cursor-like IDE experience in the browser.

## Overview

This package configures and runs code-server as the IDE backend for OdaxAI Studio. It provides:

- Full VS Code environment in the browser
- Custom OdaxAI theme and extensions
- Integration with web shell via proxy
- File system access
- Integrated terminal
- Extension support (including llama.vscode)

## Setup

```bash
# Install code-server and configure
pnpm run setup

# Start code-server
pnpm start

# Stop code-server
pnpm stop

# Clean data and reset
pnpm clean
```

## Configuration

Configuration is stored in `config/config.yaml`:

```yaml
bind-addr: 127.0.0.1:8080
auth: none
disable-telemetry: true
user-data-dir: ./data
extensions-dir: ./extensions
```

### Custom Settings

Edit `data/User/settings.json` to customize:

```json
{
  "workbench.colorTheme": "OdaxAI Dark",
  "editor.fontSize": 14,
  "editor.fontFamily": "'SF Mono', Menlo, Monaco, 'Courier New'",
  "editor.minimap.enabled": true,
  "terminal.integrated.fontSize": 13
}
```

## Directory Structure

```
apps/ide/
├── config/           # code-server configuration
│   └── config.yaml
├── data/            # User data (settings, state)
├── extensions/      # Installed extensions
├── scripts/         # Setup and management scripts
└── README.md
```

## Installing Extensions

```bash
# From command line
code-server --install-extension publisher.extension-name

# From web UI
# Click Extensions icon → Search → Install
```

### Recommended Extensions

- **llama.vscode** - Local LLM integration
- **Prettier** - Code formatting
- **ESLint** - JavaScript linting
- **GitLens** - Enhanced Git integration

## Theming

Custom OdaxAI theme will be added in MLP-2.

For now, use one of the built-in dark themes:
- Dark+ (default dark)
- Monokai
- One Dark Pro

## Integration with Web Shell

The Next.js web app proxies `/ide/*` to code-server:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/ide/:path*',
      destination: 'http://localhost:8080/:path*',
    },
  ];
}
```

This allows seamless navigation between Chat and IDE within OdaxAI Studio.

## Security

- **Auth disabled** for local development
- Bound to `127.0.0.1` (localhost only)
- For production: Add authentication token
- Consider HTTPS for external access

## Troubleshooting

### Port 8080 already in use

```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or change port in config/config.yaml
bind-addr: 127.0.0.1:8081
```

### Extensions not loading

```bash
# Clear extension cache
rm -rf extensions data/CachedExtensionVSIXs

# Reinstall
pnpm run setup
```

### Can't access from web shell

1. Ensure code-server is running: `pnpm start`
2. Test directly: http://localhost:8080
3. Check Next.js proxy configuration
4. Verify CORS settings if needed

## Next Steps (MLP-2)

- [ ] Custom OdaxAI theme
- [ ] Pre-install llama.vscode
- [ ] Default workspace configuration
- [ ] Custom welcome page
- [ ] Branding (logo, colors)
- [ ] Authentication integration
- [ ] Better iframe integration (remove chrome)

## Resources

- [code-server Documentation](https://coder.com/docs/code-server)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Custom Themes Guide](https://code.visualstudio.com/api/extension-guides/color-theme)

