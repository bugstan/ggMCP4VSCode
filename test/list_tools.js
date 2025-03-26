const { findMCPServerPort, makeRequest, colors, getStandardApiPath } = require('./utils');

/**
 * Test get available tools list
 * @param {number} port Port number
 */
async function testListTools(port) {
    console.log(`\n========== Test Get Available Tools ==========`);
    
    try {
        // Get standard API path
        const apiPath = getStandardApiPath('list_tools');
        
        // Display API endpoint (blue)
        console.log(`\n${colors.blue}API Endpoint: http://localhost:${port}${apiPath}${colors.reset}`);
        
        // Show request information
        console.log(`\nOriginal Request: None`);
        
        // Send request
        const response = await makeRequest(port, apiPath, 'GET');
        
        // Add port to response for display purposes
        response.port = port;
        
        // Display response (green for success, red for failure)
        const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
        
        console.log(`\nOriginal Response:`);
        if (isSuccess) {
            console.log(`${colors.green}${JSON.stringify(response.parsedResponse, null, 2)}${colors.reset}`);
        } else {
            console.log(`${colors.red}${JSON.stringify(response.parsedResponse, null, 2)}${colors.reset}`);
        }
        
        // Display request result at the bottom
        console.log(`\nRequest Result: ${isSuccess ? colors.green + 'SUCCESS' + colors.reset : colors.red + 'FAILED' + colors.reset}`);
        
        return response.parsedResponse;
    } catch (error) {
        console.log(`\nOriginal Response:`);
        console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
        
        // Display request result at the bottom
        console.log(`\nRequest Result: ${colors.red}FAILED${colors.reset}`);
        throw error;
    }
}

// If running directly
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testListTools(port);
        } catch (error) {
            process.exit(1);
        }
    })();
}

module.exports = { testListTools };
