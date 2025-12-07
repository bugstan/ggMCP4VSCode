# GG MCP for VSCode - Deployment Guide

This document covers the build, release, and publishing process for the GG MCP for VSCode extension.

---

## Prerequisites

- Node.js >= 18.x
- npm or pnpm
- [Visual Studio Code](https://code.visualstudio.com/)

---

## 1. Local Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Run Tests

```bash
npm test
```

---

## 2. Packaging

### Create VSIX Package

```bash
npm run package
# Or directly:
npx @vscode/vsce package
```

This creates a `.vsix` file in the project root (e.g., `gg-mcp-for-vscode-1.2.3.vsix`).

### Install Locally

```bash
code --install-extension gg-mcp-for-vscode-*.vsix
```

---

## 3. Release Process

This project uses **GitHub Actions** for automated releases.

### How to Release

```bash
# 1. Update version in package.json
# 2. Update version in README.md (Current Version badge)

# 3. Commit changes
git add .
git commit -m "chore: bump version to x.x.x"
git push origin main

# 4. Create and push tag
git tag vx.x.x
git push origin vx.x.x
```

### Automated Publishing

When a tag matching `v*` is pushed, GitHub Actions automatically:

1. **Build** - Compiles TypeScript and packages VSIX
2. **Publish to VS Code Marketplace** - Using `VSCE_PAT` secret
3. **Publish to Open VSX Registry** - Using `OVSX_PAT` secret

---

## 4. Required GitHub Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `VSCE_PAT` | VS Code Marketplace Personal Access Token | [Azure DevOps](https://dev.azure.com/) → User Settings → Personal Access Tokens |
| `OVSX_PAT` | Open VSX Registry Access Token | [Open VSX](https://open-vsx.org/) → User Settings → Access Tokens |

### Creating VSCE_PAT

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with your Microsoft account
3. User Settings → Personal Access Tokens → New Token
4. Set:
   - Name: `vsce-publish`
   - Organization: `All accessible organizations`
   - Scopes: `Marketplace` → `Manage`
5. Copy and save the token

### Creating OVSX_PAT

1. Go to [Open VSX](https://open-vsx.org/)
2. Sign in with GitHub
3. User Settings → Access Tokens → Create Token
4. Copy and save the token

---

## 5. Manual Publishing (Optional)

### VS Code Marketplace

```bash
npx @vscode/vsce publish -p <VSCE_PAT>
```

### Open VSX Registry

```bash
npx ovsx publish -p <OVSX_PAT>
```

---

## 6. CI/CD Configuration

| Setting | Value |
|---------|-------|
| Trigger | Push tag matching `v*` |
| Workflow | `.github/workflows/publish.yml` |
| Node Version | 22.x |
| Targets | VS Code Marketplace + Open VSX |

---

## 7. Troubleshooting

### VSCE Errors

| Error | Solution |
|-------|----------|
| `Invalid publisher name` | Ensure `publisher` in `package.json` matches your marketplace publisher ID |
| `Token expired` | Generate a new PAT and update GitHub Secrets |
| `Extension not found` | First publish must be done manually via the [Marketplace Portal](https://marketplace.visualstudio.com/manage) |

### Build Errors

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run compile
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2025-12-07 | Initial deployment guide |
