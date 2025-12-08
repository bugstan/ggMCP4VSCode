const http = require('http');
const path = require('path');

/**
 * Utils module - Provides common functions for testing VSCode MCP Server API
 */

// Define terminal colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

// Configuration
const config = {
    ports: {
        default: 9960,
        start: 9960,
        end: 9990
    },
    paths: {
        standard: '/',
        alternative: '/'
    }
};

/**
 * Build JSON-RPC 2.0 request body
 */
function buildJsonRpcRequest(method, params = {}, id = 1) {
    return {
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: id
    };
}

/**
 * Get port from command line arguments, if not provided return null
 */
function getPortFromArgs() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--port=')) {
            const port = parseInt(args[i].split('=')[1]);
            return isNaN(port) ? null : port;
        } else if (args[i].startsWith('-p=')) {
            const port = parseInt(args[i].split('=')[1]);
            return isNaN(port) ? null : port;
        } else if ((args[i] === '--port' || args[i] === '-p') && i + 1 < args.length) {
            const port = parseInt(args[i + 1]);
            return isNaN(port) ? null : port;
        }
    }

    return config.ports.default;
}

/**
 * Find available VSCode MCP Server port
 */
async function findMCPServerPort(portStart = config.ports.start, portEnd = config.ports.end) {
    const cmdPort = getPortFromArgs();
    if (cmdPort) {
        console.log(`Using command line specified port: ${cmdPort}`);
        return cmdPort;
    }

    console.log(`No port specified, using default port: ${portStart}`);
    return portStart;
}

/**
 * Send HTTP request
 */
async function makeRequest(port, path, method, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                // For JSON-RPC, 200 is always returned even for application errors
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const originalResponseText = data;
                        let parsedResponse = null;

                        try {
                            parsedResponse = JSON.parse(data);
                        } catch (e) {
                            parsedResponse = data;
                        }

                        resolve({
                            rawResponse: originalResponseText,
                            parsedResponse: parsedResponse,
                            requestedPath: path,
                            requestMethod: method,
                            statusCode: res.statusCode,
                            port: port,
                            requestBody: body
                        });
                    } catch (e) {
                        resolve({
                            rawResponse: data,
                            parsedResponse: null,
                            requestedPath: path,
                            requestMethod: method,
                            statusCode: res.statusCode,
                            port: port,
                            requestBody: body
                        });
                    }
                } else {
                    reject(new Error(`HTTP request failed, status: ${res.statusCode}, response: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Build request body (Deprecated, use buildJsonRpcRequest)
 */
function buildRequestBody(toolName, args = {}) {
    return buildJsonRpcRequest('tools/call', {
        name: toolName,
        arguments: args
    });
}

/**
 * Get standard API path (Deprecated/Modified)
 */
function getStandardApiPath(methodName) {
    // For JSON-RPC, the path is usually root, method is in body
    return '/'; 
}

/**
 * Display response according to requirements
 */
function displayResponse(response) {
    // Display API endpoint (highlighted in blue)
    console.log(`\n${colors.blue}API Endpoint: http://localhost:${response.port}${response.requestedPath}${colors.reset}`);

    // Display original request content
    const requestBody = response.requestBody;
    console.log(`\nOriginal Request:${requestBody ? '\n' + JSON.stringify(requestBody, null, 2) : ' None'}`);

    // Display original response (green for success, red for failure)
    // Check JSON-RPC specific error
    const isSuccess = response.statusCode >= 200 && response.statusCode < 300 && 
                     (!response.parsedResponse || !response.parsedResponse.error);
    
    console.log(`\nOriginal Response:`);
    if (isSuccess) {
        console.log(`${colors.green}${JSON.stringify(response.parsedResponse, null, 2)}${colors.reset}`);
    } else {
        console.log(`${colors.red}${JSON.stringify(response.parsedResponse, null, 2)}${colors.reset}`);
    }
    
    // Display request result at the bottom (green for success, red for failure)
    console.log(`\nRequest Result: ${isSuccess ? colors.green + 'SUCCESS' + colors.reset : colors.red + 'FAILED' + colors.reset}`);
}

// Export functions
module.exports = {
    findMCPServerPort,
    makeRequest,
    buildRequestBody,
    buildJsonRpcRequest,
    displayResponse,
    getPortFromArgs,
    colors,
    getStandardApiPath,
    config
};