/**
 * Default Configuration Values
 * This file contains the default configuration values for the application
 */

export const Defaults = {
    /** Server port configuration */
    Server: {
        /** Start of port range */
        portStart: 9960,
        /** End of port range */
        portEnd: 9990,
        /** List of preferred ports to try */
        preferredPorts: [9960, 9970, 9980, 9990, 8080, 3000],
        /** URL path prefix */
        pathPrefix: '/mcp/',
        /** Maximum concurrent connections */
        maxConnections: 100,
        /** Request timeout (milliseconds) */
        requestTimeout: 30000,
        /** Server startup retry count */
        startupRetries: 3,
        /**
         * MCP Security: Only bind to localhost (127.0.0.1) instead of all interfaces (0.0.0.0)
         * See: https://modelcontextprotocol.io/docs/concepts/transports#security-warning
         */
        bindToLocalhost: true,
        /**
         * Allowed Origins for CORS validation
         * MCP Security: Validates Origin header to prevent DNS rebinding attacks
         * Empty array means accept all origins (not recommended for production)
         */
        allowedOrigins: ['vscode-webview://*', 'http://localhost:*', 'http://127.0.0.1:*'],
    },

    /** Port scanner configuration */
    PortScanner: {
        /** Default timeout (milliseconds) */
        timeout: 400,
        /** Number of parallel scans */
        concurrency: 8,
        /** Number of retries */
        retries: 1,
        /** Cache TTL (milliseconds) */
        cacheTTL: 30000,
    },

    /** Logging configuration */
    Logger: {
        /** Whether logging is enabled */
        enabled: true,
        /** Default log level */
        level: 'info',
        /** Whether file logging is enabled */
        enableFileLogging: true,
        /** Log file path */
        logFilePath: '${workspaceFolder}/.vscode/ggmcp-logs',
        /** Maximum log file size (bytes) */
        maxFileSize: 1024 * 1024 * 10, // 10MB
        /** Number of log files to retain */
        maxFiles: 5,
        /** Whether to show timestamps in console */
        showTimestamps: true,
    },

    /** Cache configuration */
    Cache: {
        /** Whether caching is enabled */
        enabled: false,
        /** Cache TTL (milliseconds) */
        ttl: 30000,
        /** Maximum number of cache items */
        maxItems: 1000,
        /** Whether to cache request results */
        cacheResponses: false,
    },

    /** File watcher configuration */
    FileWatcher: {
        /** Whether file watching is enabled */
        enabled: true,
        /** File patterns to watch */
        patterns: ['**/*.html', '**/*.css', '**/*.js', '**/*.json'],
        /** Ignored folders/files */
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        /** File change debounce delay (milliseconds) */
        debounceDelay: 300,
        /** Whether to watch subdirectories */
        watchSubdirectories: true,
    },

    /** File reloader configuration */
    FileReloader: {
        /** Whether file auto-reload is enabled */
        enabled: false,
        /** Whether to auto-reload modified files */
        autoReloadModifiedFiles: false,
        /** Reload delay (milliseconds) */
        reloadDelay: 100,
        /** Large file threshold (bytes) - use command to reload files above this size */
        largeFileThreshold: 1024 * 1024, // 1MB
    },

    /** Notification configuration */
    Notifications: {
        /** Whether to show file change notifications */
        showFileChangeNotifications: false,
        /** Notification duration (milliseconds) */
        duration: 5000,
        /** Types of notifications to show */
        types: {
            error: true,
            warning: true,
            info: true,
            debug: false,
        },
        /** Maximum number of notifications */
        maxNotifications: 5,
    },

    /** Performance monitoring configuration */
    Performance: {
        /** Whether performance monitoring is enabled */
        enabled: true,
        /** Performance report interval (milliseconds) */
        reportInterval: 60000,
        /** Slow operation threshold (milliseconds) */
        slowOperationThreshold: 1000,
        /** Whether to log request processing time */
        measureRequestTime: true,
    },

    /** Debug configuration */
    Debug: {
        /** Whether debug mode is enabled */
        enabled: false,
        /** Debug verbosity level */
        verbosity: 1,
        /** Whether to print network requests in console */
        logNetworkRequests: false,
        /** Whether to capture detailed timing information */
        captureTimingInfo: false,
    },

    /**
     * Thresholds for logging and performance monitoring
     * These values control when operations are considered "slow" and logged
     */
    Thresholds: {
        /** Time threshold for logging slow tool operations (ms) */
        slowToolOperationMs: 100,
        /** Time threshold for logging slow file operations (ms) */
        slowFileOperationMs: 200,
        /** Time threshold for warning about very slow file operations (ms) */
        verySlowFileOperationMs: 500,
        /** Time threshold for logging slow interceptor operations (ms) */
        slowInterceptorMs: 10,
        /** Time threshold for logging slow request handling (ms) */
        slowRequestHandlingMs: 50,
        /** Time threshold for logging slow parse operations (ms) */
        slowParseMs: 100,
        /** String length threshold for truncation in logs */
        logTruncationLength: 100,
    },

    /**
     * Size limits for various operations
     */
    Limits: {
        /** Large file size threshold (bytes) */
        largeFileSize: 1024 * 1024, // 1MB
        /** Medium file size threshold (bytes) */
        mediumFileSize: 100 * 1024, // 100KB
        /** Maximum buffer size for command output (bytes) */
        commandBufferSize: 1024 * 1024, // 1MB
        /** Maximum number of concurrent file operations */
        maxConcurrentFileOps: 10,
        /** Maximum output lines for terminal commands */
        maxTerminalOutputLines: 100,
        /** Large file reload delay (milliseconds) */
        largeFileReloadDelayMs: 100,
        /** Small file reload delay (milliseconds) */
        smallFileReloadDelayMs: 10,
    },
};
