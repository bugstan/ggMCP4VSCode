import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log level enumeration
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
    NONE = 5
}

/**
 * Log output destination enumeration
 */
export enum LogDestination {
    CONSOLE = 'console',
    FILE = 'file',
    BOTH = 'both'
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
    level: LogLevel;
    destination: LogDestination;
    filePath?: string;
    maxFileSize?: number; // Max size in bytes before rotation
    maxFiles?: number; // Max number of files to keep
    prefix?: string;
    includeTimestamp?: boolean;
    includeModule?: boolean;
}

/**
 * Enhanced unified logger helper class
 * Controls log levels based on configuration and provides consistent log formatting
 * Supports multiple output destinations, log rotation, and customizable formatting
 */
export class Logger {
    private static readonly DEFAULT_PREFIX = 'ggMCP';
    private static readonly LOG_FILE_EXT = '.log';
    private static readonly DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static readonly DEFAULT_MAX_FILES = 5;
    
    private static config: LoggerConfig = {
        level: LogLevel.INFO,
        destination: LogDestination.CONSOLE,
        prefix: Logger.DEFAULT_PREFIX,
        includeTimestamp: true,
        includeModule: true,
        maxFileSize: Logger.DEFAULT_MAX_FILE_SIZE,
        maxFiles: Logger.DEFAULT_MAX_FILES
    };

    /**
     * Initialize logger with configuration
     * Reads log level settings from VS Code configuration
     */
    public static initialize(customConfig?: Partial<LoggerConfig>): void {
        try {
            // Load from VS Code configuration if available
            if (vscode && vscode.workspace) {
                const vsConfig = vscode.workspace.getConfiguration('ggMCP');
                
                // Parse log level from configuration
                const configLevel = vsConfig.get<string>('logLevel', 'info');
                this.config.level = this.parseLogLevel(configLevel);
                
                // Parse destination from configuration
                const configDest = vsConfig.get<string>('logDestination', 'console');
                this.config.destination = this.parseLogDestination(configDest);
                
                // Get other configuration values
                this.config.prefix = vsConfig.get<string>('logPrefix', this.DEFAULT_PREFIX);
                this.config.filePath = vsConfig.get<string>('logFilePath', '');
                this.config.maxFileSize = vsConfig.get<number>('logMaxFileSize', this.DEFAULT_MAX_FILE_SIZE);
                this.config.maxFiles = vsConfig.get<number>('logMaxFiles', this.DEFAULT_MAX_FILES);
                this.config.includeTimestamp = vsConfig.get<boolean>('logIncludeTimestamp', true);
                this.config.includeModule = vsConfig.get<boolean>('logIncludeModule', true);
            }
            
            // Override with custom config if provided
            if (customConfig) {
                this.config = { ...this.config, ...customConfig };
            }
            
            // Create log directory if needed
            if (this.config.destination !== LogDestination.CONSOLE && this.config.filePath) {
                const logDir = path.dirname(this.config.filePath);
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
            }
            
            this.info('System', `Logger initialized with level: ${LogLevel[this.config.level]}, destination: ${this.config.destination}`);
        } catch (err) {
            console.error('Failed to initialize logger:', err);
            // Use default configuration if initialization fails
        }
    }
    
    /**
     * Set logger configuration programmatically
     */
    public static setConfig(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
        this.info('System', `Logger configuration updated: ${JSON.stringify(this.config)}`);
    }
    
    /**
     * Parse log level string to enum value
     */
    private static parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'debug': return LogLevel.DEBUG;
            case 'info': return LogLevel.INFO;
            case 'warn':
            case 'warning': return LogLevel.WARN;
            case 'error': return LogLevel.ERROR;
            case 'fatal': return LogLevel.FATAL;
            case 'none': return LogLevel.NONE;
            default: return LogLevel.INFO;
        }
    }
    
    /**
     * Parse log destination string to enum value
     */
    private static parseLogDestination(destination: string): LogDestination {
        switch (destination.toLowerCase()) {
            case 'console': return LogDestination.CONSOLE;
            case 'file': return LogDestination.FILE;
            case 'both': return LogDestination.BOTH;
            default: return LogDestination.CONSOLE;
        }
    }

    /**
     * Get current formatted timestamp
     */
    private static getTimestamp(): string {
        return new Date().toISOString().replace('T', ' ').substring(0, 23);
    }

    /**
     * Format log message according to configuration
     */
    private static formatMessage(level: string, module: string, message: string): string {
        let formattedMessage = '';
        
        if (this.config.includeTimestamp) {
            formattedMessage += `[${this.getTimestamp()}] `;
        }
        
        formattedMessage += `[${this.config.prefix}] [${level}]`;
        
        if (this.config.includeModule && module) {
            formattedMessage += ` [${module}]`;
        }
        
        formattedMessage += ` ${message}`;
        
        return formattedMessage;
    }

    /**
     * Check if specified log level should be recorded based on configuration
     */
    private static shouldLog(level: LogLevel): boolean {
        return level >= this.config.level && this.config.level !== LogLevel.NONE;
    }
    
    /**
     * Write message to configured destinations
     */
    private static writeLog(formattedMessage: string, level: LogLevel, args: any[]): void {
        // Write to console if configured
        if (this.config.destination === LogDestination.CONSOLE || this.config.destination === LogDestination.BOTH) {
            switch(level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage, ...args);
                    break;
                case LogLevel.INFO:
                    console.log(formattedMessage, ...args);
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, ...args);
                    break;
                case LogLevel.ERROR:
                case LogLevel.FATAL:
                    console.error(formattedMessage, ...args);
                    break;
            }
        }
        
        // Write to file if configured
        if ((this.config.destination === LogDestination.FILE || this.config.destination === LogDestination.BOTH) 
            && this.config.filePath) {
            try {
                this.writeToFile(formattedMessage, args);
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }
    
    /**
     * Write log message to file with rotation if needed
     */
    private static writeToFile(message: string, args: any[]): void {
        if (!this.config.filePath) {
            return;
        }
        
        try {
            // Check if file exists and should be rotated
            if (fs.existsSync(this.config.filePath)) {
                const stats = fs.statSync(this.config.filePath);
                if (stats.size >= (this.config.maxFileSize || this.DEFAULT_MAX_FILE_SIZE)) {
                    this.rotateLogFile();
                }
            }
            
            // Format the arguments for file output
            let argsStr = '';
            if (args && args.length > 0) {
                argsStr = args.map(arg => {
                    if (arg === null) return 'null';
                    if (arg === undefined) return 'undefined';
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                argsStr = ' ' + argsStr;
            }
            
            // Append to log file
            fs.appendFileSync(this.config.filePath, message + argsStr + '\n');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }
    
    /**
     * Rotate log files when size limit is reached
     */
    private static rotateLogFile(): void {
        if (!this.config.filePath) {
            return;
        }
        
        try {
            const maxFiles = this.config.maxFiles || this.DEFAULT_MAX_FILES;
            const baseFilePath = this.config.filePath;
            const dirName = path.dirname(baseFilePath);
            const baseName = path.basename(baseFilePath, this.LOG_FILE_EXT);
            
            // Delete oldest file if it exists
            const oldestFile = path.join(dirName, `${baseName}.${maxFiles - 1}${this.LOG_FILE_EXT}`);
            if (fs.existsSync(oldestFile)) {
                fs.unlinkSync(oldestFile);
            }
            
            // Shift existing log files
            for (let i = maxFiles - 2; i >= 0; i--) {
                const oldFile = path.join(dirName, `${baseName}${i > 0 ? '.' + i : ''}${this.LOG_FILE_EXT}`);
                const newFile = path.join(dirName, `${baseName}.${i + 1}${this.LOG_FILE_EXT}`);
                
                if (fs.existsSync(oldFile)) {
                    fs.renameSync(oldFile, newFile);
                }
            }
            
            // Create new empty log file
            fs.writeFileSync(this.config.filePath, '');
        } catch (error) {
            console.error('Error rotating log files:', error);
        }
    }

    /**
     * Log debug level message
     * @param module Module name
     * @param message Log message
     * @param args Additional parameters
     */
    public static debug(module: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            const formattedMessage = this.formatMessage('DEBUG', module, message);
            this.writeLog(formattedMessage, LogLevel.DEBUG, args);
        }
    }

    /**
     * Log info level message
     * @param module Module name
     * @param message Log message
     * @param args Additional parameters
     */
    public static info(module: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            const formattedMessage = this.formatMessage('INFO', module, message);
            this.writeLog(formattedMessage, LogLevel.INFO, args);
        }
    }

    /**
     * Log warning level message
     * @param module Module name
     * @param message Log message
     * @param args Additional parameters
     */
    public static warn(module: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            const formattedMessage = this.formatMessage('WARN', module, message);
            this.writeLog(formattedMessage, LogLevel.WARN, args);
        }
    }

    /**
     * Log error level message
     * @param module Module name
     * @param message Log message
     * @param error Error object
     * @param args Additional parameters
     */
    public static error(module: string, message: string, error?: any, ...args: any[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const formattedMessage = this.formatMessage('ERROR', module, message);
            
            if (error) {
                if (error instanceof Error) {
                    this.writeLog(formattedMessage, LogLevel.ERROR, [
                        `${error.message}\nStack: ${error.stack || 'No stack trace'}`,
                        ...args
                    ]);
                } else {
                    this.writeLog(formattedMessage, LogLevel.ERROR, [String(error), ...args]);
                }
            } else {
                this.writeLog(formattedMessage, LogLevel.ERROR, args);
            }
        }
    }
    
    /**
     * Log fatal level message
     * @param module Module name
     * @param message Log message
     * @param error Error object
     * @param args Additional parameters
     */
    public static fatal(module: string, message: string, error?: any, ...args: any[]): void {
        if (this.shouldLog(LogLevel.FATAL)) {
            const formattedMessage = this.formatMessage('FATAL', module, message);
            
            if (error) {
                if (error instanceof Error) {
                    this.writeLog(formattedMessage, LogLevel.FATAL, [
                        `${error.message}\nStack: ${error.stack || 'No stack trace'}`,
                        ...args
                    ]);
                } else {
                    this.writeLog(formattedMessage, LogLevel.FATAL, [String(error), ...args]);
                }
            } else {
                this.writeLog(formattedMessage, LogLevel.FATAL, args);
            }
        }
    }

    /**
     * Create a module-specific logger
     * @param module Module name
     * @returns Collection of logging functions for the module
     */
    public static forModule(module: string): {
        debug: (message: string, ...args: any[]) => void;
        info: (message: string, ...args: any[]) => void;
        warn: (message: string, ...args: any[]) => void;
        error: (message: string, error?: any, ...args: any[]) => void;
        fatal: (message: string, error?: any, ...args: any[]) => void;
    } {
        return {
            debug: (message: string, ...args: any[]) => this.debug(module, message, ...args),
            info: (message: string, ...args: any[]) => this.info(module, message, ...args),
            warn: (message: string, ...args: any[]) => this.warn(module, message, ...args),
            error: (message: string, error?: any, ...args: any[]) => this.error(module, message, error, ...args),
            fatal: (message: string, error?: any, ...args: any[]) => this.fatal(module, message, error, ...args)
        };
    }
    
    /**
     * Clear all log files
     */
    public static clearLogs(): boolean {
        if (!this.config.filePath) {
            return false;
        }
        
        try {
            const baseFilePath = this.config.filePath;
            const dirName = path.dirname(baseFilePath);
            const baseName = path.basename(baseFilePath, this.LOG_FILE_EXT);
            const maxFiles = this.config.maxFiles || this.DEFAULT_MAX_FILES;
            
            // Delete main log file
            if (fs.existsSync(baseFilePath)) {
                fs.unlinkSync(baseFilePath);
            }
            
            // Delete rotated log files
            for (let i = 1; i < maxFiles; i++) {
                const rotatedFile = path.join(dirName, `${baseName}.${i}${this.LOG_FILE_EXT}`);
                if (fs.existsSync(rotatedFile)) {
                    fs.unlinkSync(rotatedFile);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing log files:', error);
            return false;
        }
    }
    
    /**
     * Get full log content from all log files
     * @param maxLines Maximum number of lines to retrieve (most recent)
     */
    public static getLogs(maxLines?: number): string {
        if (!this.config.filePath || !fs.existsSync(this.config.filePath)) {
            return '';
        }
        
        try {
            const baseFilePath = this.config.filePath;
            const dirName = path.dirname(baseFilePath);
            const baseName = path.basename(baseFilePath, this.LOG_FILE_EXT);
            const maxFiles = this.config.maxFiles || this.DEFAULT_MAX_FILES;
            
            let allLogs = '';
            
            // Read rotated log files in order (oldest first)
            for (let i = maxFiles - 1; i >= 0; i--) {
                const logFile = i === 0 
                    ? baseFilePath 
                    : path.join(dirName, `${baseName}.${i}${this.LOG_FILE_EXT}`);
                
                if (fs.existsSync(logFile)) {
                    allLogs += fs.readFileSync(logFile, 'utf8') + '\n';
                }
            }
            
            // Limit to maximum number of lines if specified
            if (maxLines && maxLines > 0) {
                const lines = allLogs.split('\n');
                if (lines.length > maxLines) {
                    return lines.slice(-maxLines).join('\n');
                }
            }
            
            return allLogs;
        } catch (error) {
            console.error('Error reading log files:', error);
            return '';
        }
    }
}

// Register VS Code workspace configuration change handler if in VS Code environment
if (vscode && vscode.workspace) {
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('ggMCP')) {
            Logger.initialize();
        }
    });

    // Initialize logger when plugin activates
    setTimeout(() => {
        Logger.initialize();
    }, 0);
}
