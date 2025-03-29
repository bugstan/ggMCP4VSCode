const { findMCPServerPort, makeRequest, buildRequestBody, colors, getStandardApiPath } = require('./utils');

/**
 * Test listing files in a folder
 * @param {number} port Port number
 * @param {string} path Directory path to list
 */
async function testListFilesInFolder(port, path = "/") {
    console.log(`\n========== Test List Files In Folder ==========`);
    console.log(`Target Path: ${path}`);
    
    try {
        // Build request body
        const requestBody = buildRequestBody("list_files_in_folder", { pathInProject: path });
        
        // Get standard API path
        const apiPath = getStandardApiPath('list_files_in_folder');
        
        // Display API endpoint (blue)
        console.log(`\n${colors.blue}API Endpoint: http://localhost:${port}${apiPath}${colors.reset}`);
        
        // Show request information
        console.log(`\nOriginal Request:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // Send request
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        
        // Display response (green for success, red for failure)
        const isSuccess = response.statusCode >= 200 && response.statusCode < 300 && 
                         (!response.parsedResponse || !response.parsedResponse.error);
        
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
            
            // Get path parameter
            const args = process.argv.slice(2);
            let path = "/";  // Default path
            
            // Find path parameter
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--path=')) {
                    path = args[i].split('=')[1];
                    break;
                } else if ((args[i] === '--path' || args[i] === '-d') && i + 1 < args.length) {
                    path = args[i + 1];
                    break;
                }
            }
            
            await testListFilesInFolder(port, path);
        } catch (error) {
            process.exit(1);
        }
    })();
}

module.exports = { testListFilesInFolder };
