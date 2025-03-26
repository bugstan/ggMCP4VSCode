import * as vscode from 'vscode';
import { Defaults } from './defaults';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('Config');

/**
 * Configuration Management Class
 * Centrally manages application configuration
 */
export class Config {
    private static instance: Config;
    private extensionConfig: vscode.WorkspaceConfiguration;
    
    private constructor() {
        this.extensionConfig = vscode.workspace.getConfiguration('ggMCP');
        log.info('Config initialized');
    }
    
    /**
     * Get configuration management singleton
     */
    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
    
    /**
     * Refresh configuration
     */
    public refresh(): void {
        this.extensionConfig = vscode.workspace.getConfiguration('ggMCP');
        log.info('Config refreshed');
    }
    
    /**
     * Get common configuration item value
     * @param key Configuration item key name
     * @param defaultValue Default value
     * @returns Configuration value
     */
    public get<T>(key: string, defaultValue: T): T {
        return this.extensionConfig.get<T>(key, defaultValue);
    }
    
    //===== Server Configuration =====
    
    /**
     * Get server port range start value
     */
    public getServerPortStart(): number {
        return this.extensionConfig.get<number>('portStart', Defaults.Server.portStart);
    }
    
    /**
     * Get server port range end value
     */
    public getServerPortEnd(): number {
        return this.extensionConfig.get<number>('portEnd', Defaults.Server.portEnd);
    }
    
    /**
     * Get list of preferred ports to try
     */
    public getPreferredPorts(): number[] {
        return this.extensionConfig.get<number[]>('preferredPorts', Defaults.Server.preferredPorts);
    }
    
    /**
     * Get server request timeout
     */
    public getServerRequestTimeout(): number {
        return this.extensionConfig.get<number>('requestTimeout', Defaults.Server.requestTimeout);
    }
    
    /**
     * Get server maximum concurrent connections
     */
    public getServerMaxConnections(): number {
        return this.extensionConfig.get<number>('maxConnections', Defaults.Server.maxConnections);
    }
    
    //===== Port Scanning Configuration =====
    
    /**
     * Get port scan timeout
     */
    public getPortScanTimeout(): number {
        return this.extensionConfig.get<number>('portScanTimeout', Defaults.PortScanner.timeout);
    }
    
    /**
     * Get port scan concurrency
     */
    public getPortScanConcurrency(): number {
        return this.extensionConfig.get<number>('portScanConcurrency', Defaults.PortScanner.concurrency);
    }
    
    /**
     * Get port scan retry count
     */
    public getPortScanRetries(): number {
        return this.extensionConfig.get<number>('portScanRetries', Defaults.PortScanner.retries);
    }
    
    //===== Logging Configuration =====
    
    /**
     * Get whether logging is enabled
     */
    public isLoggingEnabled(): boolean {
        return this.extensionConfig.get<boolean>('loggingEnabled', Defaults.Logger.enabled);
    }
    
    /**
     * Get log level
     */
    public getLogLevel(): string {
        return this.extensionConfig.get<string>('logLevel', Defaults.Logger.level);
    }
    
    /**
     * Get whether file logging is enabled
     */
    public isFileLoggingEnabled(): boolean {
        return this.extensionConfig.get<boolean>('fileLoggingEnabled', Defaults.Logger.enableFileLogging);
    }
    
    //===== Cache Configuration =====
    
    /**
     * Get whether cache is enabled
     */
    public isCacheEnabled(): boolean {
        return this.extensionConfig.get<boolean>('cacheEnabled', Defaults.Cache.enabled);
    }
    
    /**
     * Get cache TTL
     */
    public getCacheTTL(): number {
        return this.extensionConfig.get<number>('cacheTTL', Defaults.Cache.ttl);
    }
    
    //===== File Reloader Configuration =====
    
    /**
     * Get whether file reloader is enabled
     */
    public isFileReloaderEnabled(): boolean {
        return this.extensionConfig.get<boolean>('fileReloaderEnabled', Defaults.FileReloader.enabled);
    }
    
    /**
     * Get whether to auto-reload modified files
     */
    public getAutoReloadModifiedFiles(): boolean {
        return this.extensionConfig.get<boolean>('autoReloadModifiedFiles', Defaults.FileReloader.autoReloadModifiedFiles);
    }
    
    /**
     * Get large file threshold
     */
    public getLargeFileThreshold(): number {
        return this.extensionConfig.get<number>('largeFileThreshold', Defaults.FileReloader.largeFileThreshold);
    }
    
    //===== Performance Monitoring Configuration =====
    
    /**
     * Get whether performance monitoring is enabled
     */
    public isPerformanceMonitoringEnabled(): boolean {
        return this.extensionConfig.get<boolean>('performanceMonitoringEnabled', Defaults.Performance.enabled);
    }
    
    /**
     * Get performance report interval
     */
    public getPerformanceReportInterval(): number {
        return this.extensionConfig.get<number>('performanceReportInterval', Defaults.Performance.reportInterval);
    }
    
    /**
     * Get slow operation threshold
     */
    public getSlowOperationThreshold(): number {
        return this.extensionConfig.get<number>('slowOperationThreshold', Defaults.Performance.slowOperationThreshold);
    }
    
    //===== Notification Configuration =====
    
    /**
     * Get whether to show file change notifications
     */
    public getShowFileChangeNotifications(): boolean {
        return this.extensionConfig.get<boolean>('showFileChangeNotifications', Defaults.Notifications.showFileChangeNotifications);
    }
    
    //===== Debug Configuration =====
    
    /**
     * Get whether debug mode is enabled
     */
    public isDebugModeEnabled(): boolean {
        return this.extensionConfig.get<boolean>('debugModeEnabled', Defaults.Debug.enabled);
    }
    
    /**
     * Get debug verbosity level
     */
    public getDebugVerbosity(): number {
        return this.extensionConfig.get<number>('debugVerbosity', Defaults.Debug.verbosity);
    }
}

// Export default configuration
export { Defaults };

// Export configuration management instance retrieval function
export function getConfig(): Config {
    return Config.getInstance();
}