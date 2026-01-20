# Contributing to OdaxAI Studio

Thank you for your interest in contributing. This guide will help you get started.

## Project structure

```
.
├── apps/
│   └── macos/                 # Native macOS app (Swift + XcodeGen)
│       ├── project/           # Xcode project source
│       │   ├── OdaxStudio/    # Swift source files
│       │   ├── OdaxStudioTests/  # XCTest unit tests
│       │   └── project.yml    # XcodeGen spec
│       ├── scripts/           # Build & run scripts
│       └── resources/         # Entitlements, assets
├── services/
│   └── odax-chat/             # Next.js chat interface
│       ├── app/               # Pages, API routes, components
│       │   ├── api/           # REST endpoints
│       │   ├── lib/           # Core libraries
│       │   └── components/    # React components
│       └── __tests__/         # Vitest test suites
├── .github/
│   ├── workflows/ci.yml       # CI pipeline
│   ├── CODEOWNERS
│   └── ISSUE_TEMPLATE/
└── docs/                      # Documentation
```

## Development setup

```bash
# Clone
git clone https://github.com/odaxai/odaxai-studio.git
cd odaxai-studio

# Install chat service dependencies
cd services/odax-chat
npm install --legacy-peer-deps

# Run tests
npm test

# Start dev server
PORT=3002 npm run dev
```

### macOS app

```bash
brew install xcodegen
cd apps/macos/project
xcodegen generate --spec project.yml --project .
open OdaxStudio.xcodeproj
```

## Running tests

Tests run automatically in CI on every push and PR. To run locally:

```bash
# TypeScript tests (135 tests)
cd services/odax-chat && npm test

# Swift tests (33 tests)
cd apps/macos/project
xcodegen generate --spec project.yml --project .
xcodebuild test \
  -project OdaxStudio.xcodeproj \
  -scheme OdaxStudioTests \
  -configuration Debug \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO
```

## Pull request process

1. Fork the repository and create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure all tests pass locally before pushing
4. Open a PR using the provided template
5. Wait for CI checks to pass and code review

## Code style

- **TypeScript**: Prettier with single quotes, trailing commas, 80 char width
- **Swift**: Standard Swift conventions, 5.9+
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `ci:`)

## Security

- Never hardcode API keys, secrets, or credentials
- All sensitive config must come from environment variables
- See [SECURITY.md](SECURITY.md) for reporting vulnerabilities
- The test suite includes automated secret scanning that runs in CI
