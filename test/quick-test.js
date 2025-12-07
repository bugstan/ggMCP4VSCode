/**
 * Interactive MCP Server Test Tool
 *
 * This tool allows you to quickly test MCP server endpoints.
 * Usage: node test/quick-test.js <tool_name> [json_params]
 *
 * Examples:
 *   node test/quick-test.js list_tools
 *   node test/quick-test.js status
 *   node test/quick-test.js get_file_text_by_path '{"pathInProject":"package.json"}'
 *   node test/quick-test.js list_files_in_folder '{"pathInProject":"src"}'
 *   node test/quick-test.js get_project_vcs_status
 *   node test/quick-test.js get_terminal_info
 */

const { makeRequest, colors, displayResponse } = require('./utils');

// Default port
const PORT = 9960;

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║            MCP Server Interactive Test Tool                  ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node test/quick-test.js <tool_name> [json_params]

${colors.yellow}Available Test Commands:${colors.reset}

  ${colors.green}Server Status:${colors.reset}
    list_tools              - List all available tools
    status                  - Get server status
    initialize              - Initialize connection

  ${colors.green}File Operations:${colors.reset}
    get_file_text_by_path   - Read file content
    list_files_in_folder    - List directory contents
    find_files_by_name_substring - Search files by name

  ${colors.green}Editor Operations:${colors.reset}
    get_current_file_text   - Get active editor content
    get_all_open_file_paths - List all open files
    get_selected_text       - Get selected text

  ${colors.green}Git Operations:${colors.reset}
    get_project_vcs_status  - Get VCS status
    get_branch_info         - Get branch info

  ${colors.green}Terminal:${colors.reset}
    get_terminal_info       - Get terminal/OS info

${colors.yellow}Examples:${colors.reset}
  node test/quick-test.js list_tools
  node test/quick-test.js get_file_text_by_path '{"pathInProject":"package.json"}'
  node test/quick-test.js list_files_in_folder '{"pathInProject":"src"}'
  node test/quick-test.js get_project_vcs_status
`);
        return;
    }

    const toolName = args[0];
    let params = {};

    if (args[1]) {
        try {
            params = JSON.parse(args[1]);
        } catch (e) {
            console.error(`${colors.red}Error parsing JSON params: ${e.message}${colors.reset}`);
            console.log(`${colors.yellow}Tip: Use single quotes around JSON, e.g., '{"key":"value"}'${colors.reset}`);
            process.exit(1);
        }
    }

    console.log(`\n${colors.cyan}Testing tool: ${colors.bright}${toolName}${colors.reset}`);
    console.log(`${colors.dim}Port: ${PORT}${colors.reset}`);

    if (Object.keys(params).length > 0) {
        console.log(`${colors.dim}Params: ${JSON.stringify(params)}${colors.reset}`);
    }

    try {
        const startTime = Date.now();
        const path = `/api/mcp/${toolName}`;
        const response = await makeRequest(PORT, path, 'POST', params);
        const duration = Date.now() - startTime;

        displayResponse(response);
        console.log(`${colors.dim}Duration: ${duration}ms${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Make sure the extension is running in debug mode (F5)${colors.reset}\n`);
        process.exit(1);
    }
}

main();
