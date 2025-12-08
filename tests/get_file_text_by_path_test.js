const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse } = require('./utils');

/**
 * Test get_file_text_by_path tool
 */
async function testGetFileTextByPath(port) {
    console.log(`\n========== Test Get File Text By Path ==========`);

    const toolName = 'get_file_text_by_path';
    const args = {
        pathInProject: 'package.json'
    };

    // Build JSON-RPC request body
    const body = buildRequestBody(toolName, args);
    
    // Use root path for JSON-RPC
    const path = '/';

    try {
        const response = await makeRequest(port, path, 'POST', body);
        displayResponse(response);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    (async () => {
        const port = await findMCPServerPort();
        await testGetFileTextByPath(port);
    })();
}

module.exports = { testGetFileTextByPath };