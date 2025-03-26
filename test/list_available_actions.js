const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * Test the list available actions functionality and format the output
 * @param {number} port Port number
 */
async function testListAvailableActions(port) {
    console.log(`\n========== Test List Available Actions ==========`);

    try {
        // Build request body
        const requestBody = buildRequestBody("list_available_actions", {});

        console.log('\nRequest Information:');
        console.log(`URL: http://localhost:${port}/api/mcp/list_available_actions`);
        console.log(`Method: POST`);
        console.log(`Request Data: ${JSON.stringify(requestBody)}`);

        // Send request
        console.log('\nSending request...');
        const response = await makeRequest(port, '/api/mcp/list_available_actions', 'POST', requestBody);
        console.log('Response received.');

        // Display raw response data
        displayRawResponse(response);

        // Parse response
        const { actions, id, isError, originalResponse } = parseCompleteResponse(response);
        
        // Format and output the complete response structure, but replace content with actual parsed actions
        console.log('\nFormatted Response Structure:');
        console.log(`{
  "jsonrpc": "2.0",
  "id": ${id},
  "result": {
    "content": [`);

        // Output actions in array format line by line
        actions.forEach((action, index) => {
            const comma = index < actions.length - 1 ? ',' : '';
            console.log(`      {
        "id": "${action.id}",
        "text": "${action.text}"
      }${comma}`);
        });

        console.log(`    ]
  },
  "isError": ${isError}
}`);
        
        console.log(`\n✅ Response ID: ${id}, isError: ${isError}`);
        console.log(`\nParse Result: Found ${actions.length} action items`);

        if (actions.length > 0) {
            // Set column widths
            const ID_WIDTH = 50;
            const NAME_WIDTH = 40;

            // Table header
            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');
            console.log(`| ${'Action ID'.padEnd(ID_WIDTH)} | ${'Name'.padEnd(NAME_WIDTH)} |`);
            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');

            // Format output sorted by ID
            actions.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")))
                .forEach(action => {
                    const id = String(action.id || "").padEnd(ID_WIDTH);
                    const name = String(action.text || "").padEnd(NAME_WIDTH);
                    console.log(`| ${id} | ${name} |`);
                });

            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');

            // Count actions by first letter
            const groupedByFirstLetter = {};
            actions.forEach(action => {
                if (!action.id) return;
                const firstChar = String(action.id).charAt(0).toUpperCase();
                if (firstChar) {
                    groupedByFirstLetter[firstChar] = (groupedByFirstLetter[firstChar] || 0) + 1;
                }
            });

            console.log('\nAction ID First Letter Distribution:\n');

            // Distribution statistics header
            console.log('+----------+-----------+');
            console.log('| Letter   | Count     |');
            console.log('+----------+-----------+');

            // Distribution statistics content
            if (Object.keys(groupedByFirstLetter).length > 0) {
                Object.keys(groupedByFirstLetter).sort().forEach(letter => {
                    console.log(`| ${letter.padEnd(8)} | ${String(groupedByFirstLetter[letter]).padEnd(9)} |`);
                });
            } else {
                console.log('| No Data  | 0         |');
            }

            console.log('+----------+-----------+');

            return { success: true, content: actions, id, isError };
        } else {
            console.log('❌ No valid action data found.');
            return { success: false, error: "No valid action data", id, isError };
        }
    } catch (error) {
        console.error(`❌ Error testing list available actions:`, error);
        throw error;
    }
}

/**
 * Comprehensive response parsing, extracting action list, ID and isError
 * @param {any} response Original response
 * @returns {Object} Object containing actions array, id and isError
 */
function parseCompleteResponse(response) {
    // Default values
    let actions = [];
    let id = "unknown";
    let isError = false;
    let originalResponse = response;
    
    // If response is an object
    if (typeof response === 'object' && response !== null) {
        // Extract ID
        id = response.id || id;
        
        // Extract isError
        isError = response.isError === true;
        
        // If response object has result property
        if (response.result) {
            // If result.content is an array, check if it contains correct action items
            if (Array.isArray(response.result.content)) {
                // Traverse to check for items that need further parsing
                const nestedActions = [];
                
                response.result.content.forEach(item => {
                    // Check for items that need special handling
                    if (item && typeof item.text === 'string' && item.text.includes('[{') && item.text.includes('id') && item.text.includes('text')) {
                        // This is a text field containing nested JSON, need to extract actual actions
                        const extractedActions = extractActionsFromString(item.text);
                        if (extractedActions.length > 0) {
                            nestedActions.push(...extractedActions);
                        }
                    } else if (item && item.id && item.text) {
                        // This is a normal action item
                        nestedActions.push(item);
                    }
                });
                
                // If nested actions found, use them
                if (nestedActions.length > 0) {
                    actions = nestedActions;
                } else {
                    // Otherwise use original array
                    actions = response.result.content;
                }
            }
            // If result.content is a string, try to parse
            else if (typeof response.result.content === 'string') {
                actions = extractActionsFromString(response.result.content);
            }
            
            // Check if isError might be in result
            if (response.result.isError !== undefined) {
                isError = response.result.isError === true;
            }
        }
    }
    // If response is a string
    else if (typeof response === 'string') {
        // Try to parse string as JSON object
        try {
            const parsedResponse = JSON.parse(response);
            return parseCompleteResponse(parsedResponse);
        } catch (e) {
            // If parsing fails, try to extract actions directly from string
            actions = extractActionsFromString(response);
            
            // Try to extract ID from string
            const idMatch = response.match(/"id"\s*:\s*(\d+)/);
            if (idMatch && idMatch[1]) {
                id = idMatch[1];
            }
            
            // Try to extract isError from string
            isError = response.includes('"isError"\s*:\s*true');
        }
    }
    
    // If still no actions found, try final method
    if (actions.length === 0) {
        // Convert entire response to string, try to extract any possible actions
        const responseStr = JSON.stringify(response);
        const extractedActions = extractActionsFromString(responseStr);
        if (extractedActions.length > 0) {
            actions = extractedActions;
        }
    }
    
    return { actions, id, isError, originalResponse };
}

/**
 * Extract action list from string
 * @param {string} str String that might contain action list
 * @returns {Array} Action list array
 */
function extractActionsFromString(str) {
    if (typeof str !== 'string') {
        return [];
    }
    
    // Try to directly parse JSON array from string
    try {
        // Clean common escape characters
        let cleanedStr = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        
        // If string is wrapped in quotes, try to remove outer quotes
        if (cleanedStr.startsWith('"') && cleanedStr.endsWith('"')) {
            cleanedStr = cleanedStr.substring(1, cleanedStr.length - 1);
            // Clean escape characters again
            cleanedStr = cleanedStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        // Look for pattern like [{...}] - JSON array
        const arrayMatch = cleanedStr.match(/\[\s*{.*}\s*\]/s);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
        
        // Try special case - from your response example, might have format like "[{...}]"
        const quotedArrayMatch = cleanedStr.match(/"(\[\s*{.*}\s*\])"/s);
        if (quotedArrayMatch && quotedArrayMatch[1]) {
            // Clean content inside quotes again
            const innerContent = quotedArrayMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            try {
                return JSON.parse(innerContent);
            } catch (e) {
                // Ignore parse error
            }
        }
    } catch (err) {
        // Ignore parse error, continue trying other methods
    }
    
    // Use regex to extract id and text pairs
    const result = [];
    const pattern = /"id"\s*:\s*"([^"]+)"\s*,\s*"text"\s*:\s*"([^"]+)"/g;
    let match;
    
    while ((match = pattern.exec(str)) !== null) {
        if (match.length >= 3) {
            result.push({
                id: match[1],
                text: match[2]
            });
        }
    }
    
    return result;
}

// If running this script directly
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testListAvailableActions(port);
        } catch (error) {
            console.error(`Test failed: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testListAvailableActions };
