/**
 * MCP JSON-RPC 2.0 Protocol Integration Test
 *
 * Tests the new MCP-compliant JSON-RPC 2.0 protocol
 * Run with: node test/mcp-jsonrpc-test.js
 */

const http = require('http');

const PORT = 9960;
const HOST = '127.0.0.1';

/**
 * Send JSON-RPC request
 */
function sendJsonRpcRequest(method, params = {}, id = 1) {
    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        });

        const options = {
            hostname: HOST,
            port: PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data, parseError: e.message });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Test suite
 */
async function runTests() {
    console.log('================================================');
    console.log('  MCP JSON-RPC 2.0 Protocol Integration Tests');
    console.log('================================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Initialize
    console.log('📦 Test 1: initialize method');
    console.log('─'.repeat(50));
    try {
        const response = await sendJsonRpcRequest('initialize', {
            clientInfo: { name: 'test-client', version: '1.0.0' }
        }, 1);

        console.log('Response:', JSON.stringify(response, null, 2));

        if (response.jsonrpc === '2.0' && response.result && response.result.protocolVersion) {
            console.log('✅ PASS: Initialize returned valid response\n');
            passed++;
        } else {
            console.log('❌ FAIL: Invalid initialize response\n');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }

    // Test 2: tools/list
    console.log('📦 Test 2: tools/list method');
    console.log('─'.repeat(50));
    try {
        const response = await sendJsonRpcRequest('tools/list', {}, 2);

        if (response.result && response.result.tools && Array.isArray(response.result.tools)) {
            console.log(`✅ PASS: tools/list returned ${response.result.tools.length} tools`);
            console.log('First 3 tools:', response.result.tools.slice(0, 3).map(t => t.name));
            console.log();
            passed++;
        } else {
            console.log('Response:', JSON.stringify(response, null, 2));
            console.log('❌ FAIL: Invalid tools/list response\n');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }

    // Test 3: tools/call with valid tool
    console.log('📦 Test 3: tools/call method (list_files_in_folder)');
    console.log('─'.repeat(50));
    try {
        const response = await sendJsonRpcRequest('tools/call', {
            name: 'list_files_in_folder',
            arguments: { relativePath: '.' }
        }, 3);

        console.log('Response structure:', {
            jsonrpc: response.jsonrpc,
            id: response.id,
            hasResult: !!response.result,
            resultKeys: response.result ? Object.keys(response.result) : []
        });

        if (response.result && response.result.content && Array.isArray(response.result.content)) {
            console.log('✅ PASS: tools/call returned MCP-compliant response');
            console.log(`   content type: ${response.result.content[0]?.type}`);
            console.log(`   isError: ${response.result.isError}`);
            console.log();
            passed++;
        } else {
            console.log('Full response:', JSON.stringify(response, null, 2));
            console.log('❌ FAIL: Invalid tools/call response\n');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }

    // Test 4: tools/call with unknown tool
    console.log('📦 Test 4: tools/call with unknown tool');
    console.log('─'.repeat(50));
    try {
        const response = await sendJsonRpcRequest('tools/call', {
            name: 'nonexistent_tool',
            arguments: {}
        }, 4);

        if (response.result && response.result.isError === true) {
            console.log('✅ PASS: Unknown tool returned error response');
            console.log(`   content: ${response.result.content[0]?.text}\n`);
            passed++;
        } else {
            console.log('Response:', JSON.stringify(response, null, 2));
            console.log('❌ FAIL: Should return isError: true\n');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }

    // Test 5: Unknown method
    console.log('📦 Test 5: Unknown method');
    console.log('─'.repeat(50));
    try {
        const response = await sendJsonRpcRequest('unknown/method', {}, 5);

        if (response.error && response.error.code === -32601) {
            console.log('✅ PASS: Unknown method returned correct error code -32601');
            console.log(`   message: ${response.error.message}\n`);
            passed++;
        } else {
            console.log('Response:', JSON.stringify(response, null, 2));
            console.log('❌ FAIL: Should return error code -32601\n');
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }

    // Summary
    console.log('================================================');
    console.log('              Test Summary');
    console.log('================================================');
    console.log(`  Passed:  ${passed} ✅`);
    console.log(`  Failed:  ${failed} ❌`);
    console.log('================================================\n');

    if (failed === 0) {
        console.log('✅ All MCP JSON-RPC 2.0 tests passed!');
        process.exit(0);
    } else {
        console.log('❌ Some tests failed');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Test runner error:', error.message);
    console.log('\nMake sure the MCP server is running (VSCode extension in debug mode)');
    process.exit(1);
});
