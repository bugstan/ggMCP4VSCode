# Changelog

All notable changes to the ggMCP4VSCode extension will be documented in this file.

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