# Changelog

All notable changes to the GG MCP for VSCode extension will be documented in this file.

## [1.2.4] - 2024-12-08

### Changed
- **Optimization**: Removed ESLint to simplify development workflow and rely on TypeScript.
- **Fix**: Corrected CRLF line ending issues in `replace_file_content_at_position` tool.
- **Fix**: Updated and fixed outdated test scripts (e.g., `rewrite_file_content_test.js`).
- **Documentation**: Standardized documentation structure (moved Chinese docs to `docs/`) and added `RULES.md`.

## [1.2.1] - 2025-12-07

### Documentation
- Updated README with clearer support for Antigravity, Cursor, and Windsurf
- Improved SEO keywords in package.json for better discoverability

## [1.2.0] - 2025-12-07

### Added
- New `replace_specific_text` tool for replacing specific text occurrences in files
- New `append_file_content` tool for appending content to files
- New `rewrite_file_content` tool for completely rewriting file content
- New `run_command_on_background` tool for executing commands in the background
- New `get_terminal_info` tool for retrieving terminal and OS information
- New `execute_os_specific_command` tool for platform-specific command execution
- New Git advanced tools: `get_file_history`, `get_file_diff`, `get_branch_info`, `get_commit_details`, `commit_changes`, `pull_changes`, `switch_branch`, `create_branch`
- File caching mechanism for improved performance

### Changed
- Complete INTERFACE.md documentation rewrite with all 44 tools
- Added comprehensive API documentation with request/response examples
- Added tool summary table for quick reference
- Updated README with new features and improved clarity
- **Refactored magic numbers**: Centralized all hardcoded thresholds and limits into `Defaults.Thresholds` and `Defaults.Limits` in `config/defaults.ts`
- Migrated threshold values across 8 files to use centralized configuration
- Reduced log verbosity by changing many high-frequency `log.info()` to `log.debug()`
- Added `GitRepository` and related Git types in `src/types/gitTypes.ts` for type-safe Git operations
- Updated all Git tools to use `GitRepository` type instead of `any`
- **BREAKING: MCP-compliant Response format**: Completely refactored `Response` type from `{status, error}` to MCP standard `{content: McpContent[], isError}` format
- Added `McpContent` interface supporting text, image, audio, resource_link, and resource content types
- ResponseHandler methods `success()` and `failure()` now return MCP-compliant responses
- **BREAKING: JSON-RPC 2.0 Protocol**: Completely rewrote MCPService to implement standard JSON-RPC 2.0 protocol
- Implements MCP methods: `initialize`, `tools/list`, `tools/call`, `notifications/initialized`, `notifications/cancelled`
- All requests now use POST with JSON-RPC 2.0 format: `{"jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1}`

### Fixed
- Improved cross-platform path handling with `pathInProject` parameter
- Enhanced error handling and response consistency
- Fixed dead code in AbsTools.handle() where if-else branches were identical
- Fixed incorrect log level (error instead of debug) for normal operation logging
- Fixed async operations in file writes not waiting for completion, ensuring cache consistency
- Removed unused EventEmitter code from AbsFileTools reducing complexity
- Changed high-frequency cache and interceptor logs from info to debug level
- Fixed potential duplicate interceptor registration with idempotent initialization
- Added `successRaw()` method to ResponseHandler for clarity on serialization behavior

### Security (MCP Compliance)
- **Localhost binding**: Server now binds only to `127.0.0.1` instead of all interfaces, following [MCP security guidelines](https://modelcontextprotocol.io/docs/concepts/transports#security-warning)
- **Origin validation**: Added Origin header validation to prevent DNS rebinding attacks
- **Improved CORS**: CORS headers now reflect actual request origin instead of wildcard `*`
- **Tool interface compliance**: Added `title` and `annotations` optional fields to McpTool interface per MCP specification
- **Tool list response**: Now includes `title` field (auto-generated from name if not provided) and `annotations` when present

## [1.1.1] - 2025-03-30

### Added
- Updated display name to "GG MCP for VSCode" for better clarity
- Enhanced README with Claude Desktop integration details

### Changed
- Updated documentation to reflect new display name
- Improved Chinese localization support

## [1.1.0] - 2025-03-26

### Added
- Project refactoring: introduced base class abstraction, implemented caching mechanism, significantly enhancing performance and efficiency

## [1.0.5] - 2025-03-25

### Added
- Implemented comprehensive tool base class system for better tool organization
- Created specialized base classes for each tool category (File, Editor, Terminal, Code, Debug, Git)
- Added unified error handling and logging across all tools
- Introduced `toolBases.ts` for simplified tool base class imports

### Changed
- Refactored and standardized naming conventions for base classes
- Fixed TypeScript type errors related to Logger usage
- Improved type safety in base class implementations
- Updated interface documentation to reflect new tool organization

### Fixed
- Resolved property access TypeScript errors in logger usage
- Fixed potential undefined property access errors
- Improved error isolation in tool execution

## [1.0.4] - 2025-03-24

### Added
- Added support for VS Code 1.93+ Terminal Shell Integration API
- Added `execute_command_with_output` tool for capturing command line output
- Enhanced `get_terminal_text` tool to use Shell Integration API for retrieving terminal content
- Added terminal output related configuration options

### Changed
- Improved terminal command execution with timeout handling
- Optimized output capture mechanism with maximum output line limit

## [1.0.3] - 2025-03-23

### Added
- Added more support for VSCode extension development
- Enhanced tool type definitions and error handling

### Changed
- Optimized server startup process
- Improved code stability and performance

## [1.0.0] - 2025-03-22

### Added
- Localization support with Chinese README and CONTRIBUTING files
- Automated README version update script
- Enhanced development and packaging workflows
- Improved project configuration management

### Changed
- Standardized project scripts in package.json
- Updated development dependencies
- Refined .gitignore and .vscodeignore configurations

### Fixed
- Resolved potential cross-platform script compatibility issues

## [0.2.0] - 2025-03-21

### Added
- Initial GitHub repository release
- Support for over 30 VSCode API tool interfaces
- Automatic port scanning and allocation
- Server status management UI

### Changed
- Optimized server startup process
- Improved error handling mechanisms

### Fixed
- Fixed timeout issues in terminal command execution

## [0.1.0] - Unreleased

### Added
- Basic functionality for initial version
- Basic MCP protocol implementation
- Basic file and editor operation functionality
