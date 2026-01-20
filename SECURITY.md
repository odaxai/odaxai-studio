# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in OdaxAI Studio, please report it responsibly:

**Email**: [security@odaxai.com](mailto:security@odaxai.com)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and provide a timeline for resolution.

**Do not** open a public GitHub issue for security vulnerabilities.

## Security measures

### Automated checks (CI)

Every push and PR runs 168 automated tests including:

- **Secret scanning**: 11 patterns (AWS, OpenAI, Stripe, GitHub PAT, JWT, private keys, etc.)
- **Personal data detection**: Scans for hardcoded names, emails, user paths
- **Firebase credential audit**: Verifies all credentials come from environment variables
- **Repository hygiene**: Ensures no `.env`, `.pem`, `.key`, database, or binary files are tracked
- **Code-server removal regression**: Confirms removed components stay removed

### Architecture

- All AI inference runs **locally** via llama.cpp — no data leaves the device
- Firebase integration is optional and uses environment variables exclusively
- The macOS WebView restricts navigation to `localhost` and Google OAuth endpoints
- No telemetry, analytics, or tracking of any kind

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.1.x   | Yes       |
| < 1.1   | No        |
