/**
 * Test script for get_terminal_info API endpoint
 * 
 * This script tests the get_terminal_info endpoint which retrieves information 
 * about the current terminal and OS environment.
 */

const { findMCPServerPort, makeRequest, displayResponse, colors } = require('./utils');

/**
 * Test the get_terminal_info endpoint
 * @param {number} port The port number of the MCP server
 */
async function testGetTerminalInfo(port) {
    console.log(`\n========== Test Get Terminal Info (get_terminal_info) ==========`);
    
    try {
        // Print request information
        console.log('\nRequest Information:');
        console.log(`URL: http://localhost:${port}/api/mcp/get_terminal_info`);
        console.log(`Method: POST`);
        console.log(`Body: {}`);
        
        // Send request
        console.log('\nSending request...');
        const response = await makeRequest(port, '/api/mcp/get_terminal_info', 'POST', {});
        console.log('Response received.');
        
        // Display response data
        displayResponse(response);
        
        // Parse terminal info
        if (response.parsedResponse && response.parsedResponse.status) {
            const terminalInfo = response.parsedResponse.status;
            
            console.log(`\n${colors.green}Terminal Information Details:${colors.reset}`);
            console.log(`${colors.yellow}Operating System Type:${colors.reset} ${terminalInfo.osType || 'Unknown'}`);
            console.log(`${colors.yellow}Operating System Version:${colors.reset} ${terminalInfo.osVersion || 'Unknown'}`);
            console.log(`${colors.yellow}Terminal Type:${colors.reset} ${terminalInfo.terminalType || 'Unknown'}`);
            console.log(`${colors.yellow}Is Integrated Terminal:${colors.reset} ${terminalInfo.isIntegratedTerminal === true ? 'Yes' : 'No'}`);
            console.log(`${colors.yellow}Is Default Terminal:${colors.reset} ${terminalInfo.isDefault === true ? 'Yes' : 'No'}`);
            
            return terminalInfo;
        } else if (response.parsedResponse && response.parsedResponse.error) {
            console.error(`\n${colors.red}Error: ${response.parsedResponse.error}${colors.reset}`);
        } else {
            console.warn(`\n${colors.yellow}Warning: Response format does not match expectations${colors.reset}`);
        }
        
        return null;
    } catch (error) {
        console.error(`\n${colors.red}Error testing get_terminal_info: ${error.message}${colors.reset}`);
        throw error;
    }
}

// If running directly, execute the test
if (require.main === module) {
    (async () => {
        try {
            console.log(`${colors.cyan}Testing get_terminal_info API endpoint${colors.reset}`);
            const port = await findMCPServerPort();
            await testGetTerminalInfo(port);
        } catch (error) {
            console.error(`${colors.red}Test failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetTerminalInfo };
