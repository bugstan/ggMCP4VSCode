const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse } = require('./utils');

/**
 * Test rewrite_file_content tool
 */
async function testRewriteFileContent(port) {
    console.log(`\n========== Test Rewrite File Content ==========`);

    const toolName = 'rewrite_file_content';
    const args = {
        pathInProject: 'test_output.txt',
        text: '// Test content - this would replace the file content (Dry Run Test)'
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
        await testRewriteFileContent(port);
    })();
}

module.exports = { testRewriteFileContent };