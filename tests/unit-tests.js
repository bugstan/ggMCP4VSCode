/**
 * Unit Tests for Code Quality Refactoring
 *
 * Tests the Defaults configuration values that don't require VSCode.
 * Run with: node test/unit-tests.js
 */

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`  ✅ PASS: ${message}`);
        return true;
    } else {
        testsFailed++;
        console.log(`  ❌ FAIL: ${message}`);
        return false;
    }
}

function skip(message) {
    testsSkipped++;
    console.log(`  ⏭️  SKIP: ${message}`);
}

function describe(suiteName, testFn) {
    console.log(`\n📦 ${suiteName}`);
    console.log('─'.repeat(50));
    try {
        testFn();
    } catch (error) {
        if (error.message && error.message.includes("Cannot find module 'vscode'")) {
            skip(`Requires VSCode environment`);
        } else {
            console.log(`  ❌ ERROR: ${error.message}`);
            testsFailed++;
        }
    }
}

// ============================================
// TESTS
// ============================================

describe('Defaults.Thresholds Configuration', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    assert(Defaults.Thresholds !== undefined, 'Defaults.Thresholds should exist');
    assert(Defaults.Thresholds.slowToolOperationMs === 100, 'slowToolOperationMs should be 100');
    assert(Defaults.Thresholds.slowFileOperationMs === 200, 'slowFileOperationMs should be 200');
    assert(Defaults.Thresholds.verySlowFileOperationMs === 500, 'verySlowFileOperationMs should be 500');
    assert(Defaults.Thresholds.slowInterceptorMs === 10, 'slowInterceptorMs should be 10');
    assert(Defaults.Thresholds.slowRequestHandlingMs === 50, 'slowRequestHandlingMs should be 50');
    assert(Defaults.Thresholds.slowParseMs === 100, 'slowParseMs should be 100');
    assert(Defaults.Thresholds.logTruncationLength === 100, 'logTruncationLength should be 100');
});

describe('Defaults.Limits Configuration', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    assert(Defaults.Limits !== undefined, 'Defaults.Limits should exist');
    assert(Defaults.Limits.largeFileSize === 1024 * 1024, 'largeFileSize should be 1MB');
    assert(Defaults.Limits.mediumFileSize === 100 * 1024, 'mediumFileSize should be 100KB');
    assert(Defaults.Limits.commandBufferSize === 1024 * 1024, 'commandBufferSize should be 1MB');
    assert(Defaults.Limits.maxConcurrentFileOps === 10, 'maxConcurrentFileOps should be 10');
    assert(Defaults.Limits.maxTerminalOutputLines === 100, 'maxTerminalOutputLines should be 100');
    assert(Defaults.Limits.largeFileReloadDelayMs === 100, 'largeFileReloadDelayMs should be 100');
    assert(Defaults.Limits.smallFileReloadDelayMs === 10, 'smallFileReloadDelayMs should be 10');
});

describe('Defaults.Performance Configuration', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    assert(Defaults.Performance !== undefined, 'Defaults.Performance should exist');
    assert(Defaults.Performance.slowOperationThreshold === 1000, 'slowOperationThreshold should be 1000ms');
});

describe('Defaults.Server Configuration', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    assert(Defaults.Server !== undefined, 'Defaults.Server should exist');
    assert(Defaults.Server.portStart === 9960, 'Server.portStart should be 9960');
    assert(Defaults.Server.portEnd === 9990, 'Server.portEnd should be 9990');
    assert(Defaults.Server.requestTimeout === 30000, 'Server.requestTimeout should be 30000');
});

describe('Configuration Value Consistency', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    // Verify relationships
    assert(
        Defaults.Thresholds.slowFileOperationMs < Defaults.Thresholds.verySlowFileOperationMs,
        'slowFileOperationMs < verySlowFileOperationMs'
    );
    assert(
        Defaults.Limits.mediumFileSize < Defaults.Limits.largeFileSize,
        'mediumFileSize < largeFileSize'
    );
    assert(
        Defaults.Server.portStart < Defaults.Server.portEnd,
        'Server.portStart < Server.portEnd'
    );
    assert(
        Defaults.Limits.smallFileReloadDelayMs < Defaults.Limits.largeFileReloadDelayMs,
        'smallFileReloadDelayMs < largeFileReloadDelayMs'
    );

    // All values positive
    const allThresholds = Object.values(Defaults.Thresholds);
    assert(
        allThresholds.every(v => typeof v === 'number' && v > 0),
        'All threshold values should be positive numbers'
    );

    const allLimits = Object.values(Defaults.Limits);
    assert(
        allLimits.every(v => typeof v === 'number' && v > 0),
        'All limit values should be positive numbers'
    );
});

describe('Configuration Completeness', () => {
    const { Defaults } = require('../dist/config/defaults.js');

    const expectedKeys = [
        'Server', 'PortScanner', 'Logger', 'Cache',
        'FileWatcher', 'FileReloader', 'Notifications',
        'Performance', 'Debug', 'Thresholds', 'Limits'
    ];

    for (const key of expectedKeys) {
        assert(Defaults[key] !== undefined, `Defaults.${key} should exist`);
    }
});

// VSCode-dependent tests (will skip)
describe('Interceptor Initialization (requires VSCode)', () => {
    const interceptorsModule = require('../dist/server/interceptors/index.js');

    interceptorsModule.resetInterceptors();
    assert(interceptorsModule.isInterceptorsInitialized() === false, 'Initial state: not initialized');

    interceptorsModule.initializeInterceptors();
    assert(interceptorsModule.isInterceptorsInitialized() === true, 'After init: initialized');

    const chain = interceptorsModule.InterceptorChain.getInstance();
    const countBefore = chain.getInterceptors().length;

    interceptorsModule.initializeInterceptors(); // Call again
    const countAfter = chain.getInterceptors().length;

    assert(countBefore === countAfter, `Idempotent: count ${countBefore} = ${countAfter}`);

    interceptorsModule.resetInterceptors();
});

describe('ResponseHandler Methods (requires VSCode)', () => {
    const { responseHandler } = require('../dist/server/responseHandler.js');

    // Test success()
    const objResult = responseHandler.success({ key: 'value' });
    assert(typeof objResult.status === 'string', 'success() stringifies objects');
    assert(objResult.error === null, 'success() has null error');

    // Test successRaw()
    const rawResult = responseHandler.successRaw({ key: 'value' });
    assert(typeof rawResult.status === 'object', 'successRaw() preserves objects');

    // Test failure()
    const failResult = responseHandler.failure('error');
    assert(failResult.status === null, 'failure() has null status');
    assert(failResult.error === 'error', 'failure() has error message');
});

// ============================================
// SUMMARY
// ============================================

console.log('\n==========================================');
console.log('              Test Summary');
console.log('==========================================');
console.log(`  Passed:  ${testsPassed} ✅`);
console.log(`  Failed:  ${testsFailed} ❌`);
console.log(`  Skipped: ${testsSkipped} ⏭️`);
console.log('==========================================');

if (testsFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
