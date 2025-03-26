import { Logger } from './logger';

// Define category types
type CategoryKey = 'small' | 'medium' | 'large';

// Define category metrics interface
interface CategoryMetrics {
    count: number;
    totalTimeMs: number;
    totalChars: number;
}

// Define performance metrics interface
interface PerformanceMetrics {
    totalWrites: number;
    totalChars: number;
    totalTimeMs: number;
    slowOperations: number;
    categories: Record<CategoryKey, CategoryMetrics>;
    slowestOperation: {
        path: string;
        timeMs: number;
        chars: number;
    };
}

/**
 * File Operation Performance Monitor
 * Used to track and analyze file read/write operation performance
 */
export class FileOperationPerformance {
    // Performance metrics storage
    private static metrics: PerformanceMetrics = {
        totalWrites: 0,
        totalChars: 0,
        totalTimeMs: 0,
        slowOperations: 0,
        categories: {
            small: { count: 0, totalTimeMs: 0, totalChars: 0 },  // < 100KB
            medium: { count: 0, totalTimeMs: 0, totalChars: 0 }, // 100KB - 1MB
            large: { count: 0, totalTimeMs: 0, totalChars: 0 },  // > 1MB
        },
        slowestOperation: { path: '', timeMs: 0, chars: 0 }
    };
    
    // Dedicated logger for performance logging
    private static readonly log = Logger.forModule('PerformanceMonitor');
    
    /**
     * Record file write performance
     * @param path File path
     * @param chars Number of characters
     * @param timeMs Time taken (milliseconds)
     */
    public static recordFileWrite(path: string, chars: number, timeMs: number): void {
        this.metrics.totalWrites++;
        this.metrics.totalChars += chars;
        this.metrics.totalTimeMs += timeMs;
        
        // Determine file size category
        let category: CategoryKey = 'small';
        if (chars > 1024 * 1024) {
            category = 'large';
        } else if (chars > 100 * 1024) {
            category = 'medium';
        }
        
        // Update category statistics
        const cat = this.metrics.categories[category];
        cat.count++;
        cat.totalTimeMs += timeMs;
        cat.totalChars += chars;
        
        // Record slow operations
        if (timeMs > 1000) { // Consider operations taking more than 1 second as slow
            this.metrics.slowOperations++;
            
            // Update slowest operation record
            if (timeMs > this.metrics.slowestOperation.timeMs) {
                this.metrics.slowestOperation = {
                    path,
                    timeMs,
                    chars
                };
            }
            
            // Log warning for slow operations
            this.log.warn(`Slow file write operation: ${timeMs.toFixed(2)}ms for ${chars} chars at ${path}`);
        }
        
        // Output performance report every 50 operations
        if (this.metrics.totalWrites % 50 === 0) {
            this.logPerformanceReport();
        }
    }
    
    /**
     * Output performance report
     */
    public static logPerformanceReport(): void {
        const { totalWrites, totalChars, totalTimeMs, slowOperations, categories } = this.metrics;
        const avgTimeMs = totalWrites > 0 ? totalTimeMs / totalWrites : 0;
        
        const report = {
            totalOperations: totalWrites,
            totalCharacters: totalChars,
            totalTimeMs: totalTimeMs,
            averageTimeMs: avgTimeMs.toFixed(2),
            slowOperations: {
                count: slowOperations,
                threshold: "1000ms"
            },
            slowestOperation: {
                path: this.metrics.slowestOperation.path,
                timeMs: this.metrics.slowestOperation.timeMs.toFixed(2),
                chars: this.metrics.slowestOperation.chars
            },
            categories: {
                small: {
                    count: categories.small.count,
                    avgTimeMs: categories.small.count > 0 ? 
                        (categories.small.totalTimeMs / categories.small.count).toFixed(2) : 
                        "0.00",
                    avgSizeChars: categories.small.count > 0 ? 
                        Math.round(categories.small.totalChars / categories.small.count) : 
                        0,
                    sizeRange: "< 100KB"
                },
                medium: {
                    count: categories.medium.count,
                    avgTimeMs: categories.medium.count > 0 ? 
                        (categories.medium.totalTimeMs / categories.medium.count).toFixed(2) : 
                        "0.00",
                    avgSizeChars: categories.medium.count > 0 ? 
                        Math.round(categories.medium.totalChars / categories.medium.count) : 
                        0,
                    sizeRange: "100KB - 1MB"
                },
                large: {
                    count: categories.large.count,
                    avgTimeMs: categories.large.count > 0 ? 
                        (categories.large.totalTimeMs / categories.large.count).toFixed(2) : 
                        "0.00",
                    avgSizeChars: categories.large.count > 0 ? 
                        Math.round(categories.large.totalChars / categories.large.count) : 
                        0,
                    sizeRange: "> 1MB"
                }
            }
        };
        
        this.log.info('File write performance report (all times in milliseconds):', report);
    }
    
    /**
     * Get current performance statistics
     */
    public static getMetrics() {
        return {...this.metrics};
    }
    
    /**
     * Reset performance counters
     */
    public static reset(): void {
        this.metrics = {
            totalWrites: 0,
            totalChars: 0,
            totalTimeMs: 0,
            slowOperations: 0,
            categories: {
                small: { count: 0, totalTimeMs: 0, totalChars: 0 },
                medium: { count: 0, totalTimeMs: 0, totalChars: 0 },
                large: { count: 0, totalTimeMs: 0, totalChars: 0 },
            },
            slowestOperation: { path: '', timeMs: 0, chars: 0 }
        };
        this.log.info('Performance metrics have been reset');
    }
}