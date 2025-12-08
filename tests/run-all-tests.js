const { findMCPServerPort, colors } = require('./utils');
const { testListFilesInFolder } = require('./list_files_in_folder');
const { testListTools } = require('./list_tools');

/**
 * Run the cleaned up tests
 */
async function runTests() {
    try {
        console.log('==========================================');
        console.log('     Start Testing VSCode MCP Server API');
        console.log('==========================================');
        
        // Find MCP server port
        const port = await findMCPServerPort();
        console.log(`\nUsing port: ${port} for testing`);
        
        // Test get available tools list
        await testListTools(port);
        
        // Test directory listing functionality
        await testListFilesInFolder(port, "/");
        
        console.log('\n==========================================');
        console.log('     All Tests Completed!');
        console.log('==========================================');
    } catch (error) {
        console.error(`\nError during testing: ${error.message}`);
        process.exit(1);
    }
}

// Execute tests
runTests();