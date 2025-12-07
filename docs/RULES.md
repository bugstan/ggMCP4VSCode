# Project Development Rules

This document outlines the development rules and conventions for the ggMCP4VSCode project.

## ⚠️ CRITICAL: Extension Identity Protection

### Published Platforms

This extension is published to the following platforms:

| Platform | Extension ID | URL |
|----------|--------------|-----|
| **VS Code Marketplace** | `bugstan.gg-mcp-for-vscode` | https://marketplace.visualstudio.com/items?itemName=bugstan.gg-mcp-for-vscode |
| **Open VSX Registry** | `bugstan.gg-mcp-for-vscode` | https://open-vsx.org/extension/bugstan/gg-mcp-for-vscode |

### Publisher and Extension Name (DO NOT MODIFY)

The following fields in `package.json` are **PERMANENTLY LOCKED** and MUST NEVER be changed:

```json
{
  "name": "gg-mcp-for-vscode",
  "publisher": "bugstan"
}
```

**Reason**: This extension is published to VS Code Marketplace. Changing these fields would:
- Create a completely new extension on VS Code Marketplace
- Break all existing users' installations (no auto-update)
- Lose all download statistics, ratings, and reviews
- Users would have to manually uninstall old and install new extension

### What CAN Be Changed

| Field | Can Change? | Notes |
|-------|-------------|-------|
| `name` | ❌ NO | Extension ID component |
| `publisher` | ❌ NO | Extension ID component |
| `displayName` | ✅ YES | User-facing name |
| `version` | ✅ YES | Follow semver |
| `repository.url` | ✅ YES | GitHub URL can change |
| `homepage` | ✅ YES | GitHub URL can change |
| `bugs.url` | ✅ YES | GitHub URL can change |
| `description` | ✅ YES | Can update |

### Repository Migration Notes

This project was migrated from `github.com/bugstan/ggMCP4VSCode` to `github.com/n2ns/ggMCP4VSCode`.

- **GitHub repository**: `n2ns/ggMCP4VSCode` (new)
- **VS Code Marketplace ID**: `bugstan.gg-mcp-for-vscode` (unchanged, must remain)

---

## Code Quality Tools

### ESLint: Not Required

This project **does not use ESLint** and intentionally omits it from the development toolchain.

#### Rationale

1. **TypeScript Compiler is Sufficient**
   - The TypeScript compiler (`tsc`) already provides comprehensive type checking and catches most code quality issues.
   - Running `tsc --noEmit` produces zero errors and zero warnings, confirming the codebase is type-safe.

2. **Mature Codebase Architecture**
   - The project employs well-designed object-oriented patterns (e.g., `AbsTools<T>` abstract base class with template method pattern).
   - Consistent coding style is already achieved through established conventions, not enforced tooling.
   - All modules use a unified logging system (`Logger.forModule()`).
   - Error handling follows a consistent pattern with `responseHandler.failure()`.

3. **No ESLint in CI/CD Pipeline**
   - The GitHub Actions workflow (`publish.yml`) only runs `npm run compile`.
   - ESLint was never integrated into the build or release process.

4. **Minimal Dependencies Philosophy**
   - This project follows a minimal dependencies approach.
   - Adding ESLint would introduce 50+ additional packages to `node_modules`.
   - Less dependencies = smaller attack surface, faster installs, simpler maintenance.

5. **Single Maintainer Project**
   - ESLint's primary value is enforcing consistent style across large teams.
   - For a single-maintainer or small-team project, this overhead is unnecessary.

#### What We Use Instead

| Tool | Purpose |
|------|---------|
| `tsc` | Type checking and compilation |
| `prettier` | Code formatting (`npm run format`) |

#### If You're Contributing

- Follow the existing code style observed in the codebase.
- Ensure `npm run compile` passes without errors.
- Use `npm run format` to format your code before committing.

---

## Other Rules

### File Naming Conventions

- TypeScript source files: `camelCase.ts` (e.g., `fileReadWriteTools.ts`)
- Type definition files: `camelCase.ts` in `src/types/` directory
- Abstract base classes: Prefix with `abs` (e.g., `absTools.ts`, `absFileTools.ts`)

### Code Style

- Use TypeScript strict mode
- Prefer `async/await` over raw Promises
- Use JSDoc comments for public APIs
- Keep functions focused and single-purpose

### Commit Messages

- Use clear, descriptive commit messages
- Reference issue numbers when applicable
# Project Development Rules

This document outlines the development rules and conventions for the ggMCP4VSCode project.

## Code Quality Tools

### ESLint: Not Required

This project **does not use ESLint** and intentionally omits it from the development toolchain.

#### Rationale

1.  **TypeScript Compiler is Sufficient**
    *   The TypeScript compiler (`tsc`) already provides comprehensive type checking and catches most code quality issues.
    *   Running `tsc --noEmit` produces zero errors and zero warnings, confirming the codebase is type-safe.

2.  **Mature Codebase Architecture**
    *   The project employs well-designed object-oriented patterns (e.g., `AbsTools<T>` abstract base class with template method pattern).
    *   Consistent coding style is already achieved through established conventions, not enforced tooling.
    *   All modules use a unified logging system (`Logger.forModule()`).
    *   Error handling follows a consistent pattern with `responseHandler.failure()`.

3.  **No ESLint in CI/CD Pipeline**
    *   The GitHub Actions workflow (`publish.yml`) only runs `npm run compile`.
    *   ESLint was never integrated into the build or release process.

4.  **Minimal Dependencies Philosophy**
    *   This project follows a minimal dependencies approach.
    *   Adding ESLint would introduce 50+ additional packages to `node_modules`.
    *   Less dependencies = smaller attack surface, faster installs, simpler maintenance.

5.  **Single Maintainer Project**
    *   ESLint's primary value is enforcing consistent style across large teams.
    *   For a single-maintainer or small-team project, this overhead is unnecessary.

#### What We Use Instead

| Tool      | Purpose                               |
| --------- | ------------------------------------- |
| `tsc`     | Type checking and compilation         |
| `prettier` | Code formatting (`npm run format`)    |

#### If You're Contributing

*   Follow the existing code style observed in the codebase.
*   Ensure `npm run compile` passes without errors.
*   Use `npm run format` to format your code before committing.

---

## Other Rules

### File Naming Conventions

*   TypeScript source files: `camelCase.ts` (e.g., `fileReadWriteTools.ts`)
*   Type definition files: `camelCase.ts` in `src/types/` directory
*   Abstract base classes: Prefix with `abs` (e.g., `absTools.ts`, `absFileTools.ts`)

### Code Style

*   Use TypeScript strict mode
*   Prefer `async/await` over raw Promises
*   Use JSDoc comments for public APIs
*   Keep functions focused and single-purpose

### Commit Messages

*   Use clear, descriptive commit messages
*   Reference issue numbers when applicable

### Documentation Conventions

*   **Version History**: MUST use `CHANGELOG.md` to record all version updates and history.
*   **README Cleanliness**: DO NOT include version history or "What's New" sections in `README.md`. Keep `README.md` focused on project overview, installation, and usage key features.
*   **Language Support**: Maintain `README.md` as the primary English documentation. Place translated documentation (e.g., `README-zh.md`) in the `docs/` directory.
### 1. Version Consistency Check (CRITICAL)

**MANDATORY**: Before ANY commit or release, you MUST verify the version number is consistent across ALL of the following 5 locations. Failure to do so is UNACCEPTABLE.

1.  **`package.json`**: The `version` field.
    *   `"version": "x.y.z"`
2.  **`README.md` (English)**:
    *   **Badge**: The shield.io badge URL `version-x.y.z-blue`.
3.  **`docs/README-zh.md` (Chinese)**:
    *   **Badge**: The shield.io badge URL `version-x.y.z-blue`.
4.  **`CHANGELOG.md` (English)**:
    *   **Header**: The topmost release header `## [x.y.z] - YYYY-MM-DD`.
5.  **`docs/CHANGELOG-zh.md` (Chinese)**:
    *   **Header**: The topmost release header `## [x.y.z] - YYYY-MM-DD`.

**Checklist for every release:**
- [ ] package.json
- [ ] README.md (Badge)
- [ ] docs/README-zh.md (Badge)
- [ ] CHANGELOG.md
- [ ] docs/CHANGELOG-zh.md

---

*Last updated: December 2024*
